import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add workflow timestamp fields to evaluation
  pgm.addColumn('evaluation', {
    published_at: { type: 'timestamptz' },
    locked_at: { type: 'timestamptz' },
    published_by: { type: 'uuid' },
    locked_by: { type: 'uuid' },
  });

  // Add manual override fields to evaluation_item
  pgm.addColumn('evaluation_item', {
    manual_override_score: { type: 'numeric(6,3)' },
    override_reason: { type: 'text' },
    override_by: { type: 'uuid' },
    override_at: { type: 'timestamptz' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_item', ['manual_override_score', 'override_reason', 'override_by', 'override_at']);
  pgm.dropColumn('evaluation', ['published_at', 'locked_at', 'published_by', 'locked_by']);
}
