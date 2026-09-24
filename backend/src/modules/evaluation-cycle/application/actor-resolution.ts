import { PoolClient } from 'pg';

/**
 * Resolves the acting employee id used for created_by/updated_by on evaluation cycle writes.
 * Moved verbatim from EvaluationCycleOpeningService so opening and individual creation share it.
 */
export async function resolveValidEmployeeId(client: PoolClient, actorEmployeeId: string | null): Promise<string | null> {
  if (actorEmployeeId) {
    const checkEmp = await client.query('SELECT employee_id FROM employee WHERE employee_id = $1', [actorEmployeeId]);
    if (checkEmp.rows.length > 0) {
      return actorEmployeeId;
    }
    const checkUser = await client.query('SELECT employee_id, email FROM app_user WHERE id = $1', [actorEmployeeId]);
    if (checkUser.rows.length > 0) {
      if (checkUser.rows[0].employee_id) {
        return checkUser.rows[0].employee_id;
      }
      const checkEmail = await client.query('SELECT employee_id FROM employee WHERE LOWER(email) = LOWER($1)', [checkUser.rows[0].email]);
      if (checkEmail.rows.length > 0) {
        return checkEmail.rows[0].employee_id;
      }
    }
  }
  const fallback = await client.query('SELECT employee_id FROM employee ORDER BY created_at ASC LIMIT 1');
  return fallback.rows[0]?.employee_id || null;
}

export async function resolveValidUserId(
  client: PoolClient,
  actorId: string | null,
  actorEmployeeId: string | null
): Promise<string> {
  if (actorId) {
    const checkUser = await client.query('SELECT id FROM app_user WHERE id = $1', [actorId]);
    if (checkUser.rows.length > 0) {
      return actorId;
    }

    const checkEmployeeUser = await client.query('SELECT id FROM app_user WHERE employee_id = $1', [actorId]);
    if (checkEmployeeUser.rows.length > 0) {
      return checkEmployeeUser.rows[0].id;
    }

    if (actorEmployeeId) {
      const mappedUser = await client.query('SELECT id FROM app_user WHERE employee_id = $1', [actorEmployeeId]);
      if (mappedUser.rows.length > 0) {
        return mappedUser.rows[0].id;
      }

      const employeeEmailRes = await client.query('SELECT email FROM employee WHERE employee_id = $1', [actorEmployeeId]);
      const email = employeeEmailRes.rows[0]?.email as string | undefined;
      if (email) {
        const emailUser = await client.query('SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)', [email]);
        if (emailUser.rows.length > 0) {
          return emailUser.rows[0].id;
        }
      }
    }
  }

  const fallback = await client.query('SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1');
  if (fallback.rows[0]?.id) {
    return fallback.rows[0].id;
  }

  throw new Error('No app_user available for audit logging');
}
