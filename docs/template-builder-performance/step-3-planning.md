# Step 3 - Planning

Status: produced during this step

## Deliverable

1. **Thêm phương thức mới vào Repository**: `ITemplateCriterionRepository.findSnapshotDataByVersionId` để hỗ trợ fetch tất cả dữ liệu (Criteria, CriterionVersion, ScoringRule) trong một câu lệnh SQL (`JOIN`).
2. **Cập nhật Postgres Repository**: Viết câu lệnh `SELECT ... LEFT JOIN ...` ở file `postgres-template-criterion.repository.ts`.
3. **Sửa vòng lặp N+1**: Trong `ConfigurationSnapshotService`, thay vì dùng vòng lặp `for (const tc of templateCriteria)` và bắn nhiều query, ta sẽ gọi `this.templateCriterionRepo.findSnapshotDataByVersionId(versionId)` để lấy kết quả và map thẳng ra mảng `snapshotCriteria`.
