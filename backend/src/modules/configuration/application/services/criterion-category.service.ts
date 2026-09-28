import { PostgresCriterionCategoryRepository } from '../../infrastructure/persistence/postgres-criterion-category.repository.js';
import { CriterionCategoryEntity } from '../../domain/configuration.types.js';
import { BadRequest, NotFound } from '../../../../api/app-error.js';

export class CriterionCategoryService {
  constructor(private repo: PostgresCriterionCategoryRepository) {}

  async getCategories(status?: 'ACTIVE' | 'INACTIVE'): Promise<CriterionCategoryEntity[]> {
    return this.repo.findAll(status);
  }

  async getCategoryByCode(code: string): Promise<CriterionCategoryEntity> {
    const cat = await this.repo.findByCode(code);
    if (!cat) throw new NotFound(`Criterion category with code '${code}' not found.`);
    return cat;
  }

  async createCategory(data: { code: string; name: string; description?: string }): Promise<CriterionCategoryEntity> {
    if (!data.code || !data.code.trim()) {
      throw new BadRequest('Category code is required.', 'VALIDATION_ERROR', 'code');
    }
    if (!data.name || !data.name.trim()) {
      throw new BadRequest('Category name is required.', 'VALIDATION_ERROR', 'name');
    }
    return this.repo.create(data);
  }

  async activateCategory(code: string): Promise<CriterionCategoryEntity> {
    const existing = await this.getCategoryByCode(code);
    if (existing.status === 'ACTIVE') return existing;
    const updated = await this.repo.setStatus(code, 'ACTIVE');
    if (!updated) throw new NotFound(`Criterion category '${code}' not found.`);
    return updated;
  }

  async deactivateCategory(code: string): Promise<CriterionCategoryEntity> {
    const existing = await this.getCategoryByCode(code);
    if (existing.is_system) {
      throw new BadRequest(
        `Không thể vô hiệu hóa danh mục cốt lõi của hệ thống (${existing.name}).`,
        'CORE_CATEGORY_PROTECTED',
        'code'
      );
    }
    if (existing.status === 'INACTIVE') return existing;
    const updated = await this.repo.setStatus(code, 'INACTIVE');
    if (!updated) throw new NotFound(`Criterion category '${code}' not found.`);
    return updated;
  }
}
