import { useState } from 'react';
import {
  TemplateListScreen,
  TemplateBuilderWorkspace,
  useTemplatesQuery,
  useTemplateVersionQuery,
  useCriterionLibraryQuery,
  useSaveCriteriaDraftMutation,
  usePublishVersionMutation,
  useCreateVersionMutation,
  useTemplateDetailQuery,
} from '../index';
import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  Criterion,
  TemplateCriterion,
} from '../index';

const MOCK_CRITERIA_LIBRARY: Criterion[] = [
  {
    id: 'crit-1',
    code: 'ON_TIME_COMPLETION',
    category: 'Performance',
    name: 'On-time Completion',
    description: 'Percentage of assigned Jira tasks delivered within milestone target dates.',
    status: 'ACTIVE',
    version: 2,
    currentVersion: {
      id: 'cv-1',
      criterionId: 'crit-1',
      versionNo: 2,
      defaultWeight: 20,
      measurementUnit: '%',
      measurementSourceLabel: 'Jira Software',
      status: 'PUBLISHED',
      scoringRule: {
        id: 'rule-1',
        code: 'RANGE_ON_TIME',
        name: 'Range Threshold',
        ruleType: 'RANGE_THRESHOLD',
        config: {
          ranges: [
            { minScore: 0, maxScore: 69.99, levelId: 'l1', levelName: 'Level 1' },
            { minScore: 70, maxScore: 89.99, levelId: 'l2', levelName: 'Level 2' },
            { minScore: 90, maxScore: 100, levelId: 'l3', levelName: 'Level 3' },
          ],
        },
        status: 'ACTIVE',
        version: 1,
      },
    },
  },
  {
    id: 'crit-2',
    code: 'PLANNING_DISCIPLINE',
    category: 'Performance',
    name: 'Planning Discipline',
    description: 'Quality of sprint estimation and milestone planning accuracy.',
    status: 'ACTIVE',
    version: 1,
    currentVersion: {
      id: 'cv-2',
      criterionId: 'crit-2',
      versionNo: 1,
      defaultWeight: 15,
      measurementUnit: '%',
      measurementSourceLabel: 'Direct Input',
      status: 'PUBLISHED',
      scoringRule: {
        id: 'rule-2',
        code: 'RANGE_PLANNING',
        name: 'Range Threshold',
        ruleType: 'RANGE_THRESHOLD',
        config: {},
        status: 'ACTIVE',
        version: 1,
      },
    },
  },
  {
    id: 'crit-3',
    code: 'OWNERSHIP',
    category: 'Capability',
    name: 'Product Ownership',
    description: 'Proactive end-to-end accountability for component quality.',
    status: 'ACTIVE',
    version: 1,
    currentVersion: {
      id: 'cv-3',
      criterionId: 'crit-3',
      versionNo: 1,
      defaultWeight: 20,
      measurementUnit: 'Ordinal',
      measurementSourceLabel: 'Manager Assessment',
      status: 'PUBLISHED',
    },
  },
  {
    id: 'crit-4',
    code: 'INDEPENDENCE',
    category: 'Contribution',
    name: 'Autonomous Execution',
    description: 'Ability to execute complex technical goals with minimal supervision.',
    status: 'ACTIVE',
    version: 1,
    currentVersion: {
      id: 'cv-4',
      criterionId: 'crit-4',
      versionNo: 1,
      defaultWeight: 25,
      measurementUnit: 'Score',
      measurementSourceLabel: 'Peer & Manager Review',
      status: 'PUBLISHED',
    },
  },
  {
    id: 'crit-5',
    code: 'SYSTEM_ARCHITECTURE',
    category: 'Contribution',
    name: 'System Architecture & LLD Quality',
    description: 'Technical design quality and alignment with enterprise LLD standards.',
    status: 'ACTIVE',
    version: 1,
    currentVersion: {
      id: 'cv-5',
      criterionId: 'crit-5',
      versionNo: 1,
      defaultWeight: 20,
      measurementUnit: 'Score',
      measurementSourceLabel: 'Architecture Guild',
      status: 'PUBLISHED',
    },
  },
];

const MOCK_TEMPLATE: EvaluationTemplate = {
  id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  code: 'ENG_EVAL_2026',
  name: 'Engineering Evaluation 2026',
  description: 'Standard annual performance evaluation framework for engineering teams.',
  status: 'DRAFT',
  currentVersionId: '550e8400-e29b-41d4-a716-446655440000',
  criteriaCount: 5,
  version: 1,
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T08:30:00Z',
  updatedByName: 'Minh Nguyen',
};

const MOCK_VERSION: EvaluationTemplateVersion = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  versionNo: 1,
  status: 'DRAFT',
  weightTotalPolicy: 'EXACT_100',
  version: 1,
  criteria: [
    {
      id: 'tc-1',
      templateVersionId: '550e8400-e29b-41d4-a716-446655440000',
      criterionVersionId: 'cv-1',
      criterion: MOCK_CRITERIA_LIBRARY[0],
      effectiveWeight: 20,
      applicableRoleIds: ['role-si', 'role-sm'],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: 1,
      provenance: {
        effectiveWeight: 20,
        effectiveSource: 'TEMPLATE',
        effectiveSourceLabel: 'Template Override',
        tiers: [
          { scope: 'GLOBAL', scopeLabel: 'Global Default', weight: 10, isApplied: false },
          { scope: 'ROLE', scopeLabel: 'Role · Software Engineer', weight: 12, isApplied: false },
          { scope: 'TEAM', scopeLabel: 'Team · Core Platform', weight: 15, isApplied: false },
          { scope: 'TEMPLATE', scopeLabel: 'Template Override', weight: 20, isApplied: true },
        ],
      },
    },
    {
      id: 'tc-2',
      templateVersionId: '550e8400-e29b-41d4-a716-446655440000',
      criterionVersionId: 'cv-2',
      criterion: MOCK_CRITERIA_LIBRARY[1],
      effectiveWeight: 15,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: 2,
    },
    {
      id: 'tc-3',
      templateVersionId: '550e8400-e29b-41d4-a716-446655440000',
      criterionVersionId: 'cv-3',
      criterion: MOCK_CRITERIA_LIBRARY[2],
      effectiveWeight: 25,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: 3,
    },
    {
      id: 'tc-4',
      templateVersionId: '550e8400-e29b-41d4-a716-446655440000',
      criterionVersionId: 'cv-4',
      criterion: MOCK_CRITERIA_LIBRARY[3],
      effectiveWeight: 20,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: 4,
    },
    {
      id: 'tc-5',
      templateVersionId: '550e8400-e29b-41d4-a716-446655440000',
      criterionVersionId: 'cv-5',
      criterion: MOCK_CRITERIA_LIBRARY[4],
      effectiveWeight: 20,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: 5,
    },
  ],
};

export function EvaluationTemplatesPage() {
  const [activeView, setActiveView] = useState<'list' | 'builder'>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();

  // TanStack Queries (with mock fallback for development)
  const templatesQuery = useTemplatesQuery();
  const templateDetailQuery = useTemplateDetailQuery(selectedTemplateId);
  const templateVersionQuery = useTemplateVersionQuery(selectedTemplateId, selectedVersionId);
  const libraryQuery = useCriterionLibraryQuery();

  const saveDraftMutation = useSaveCriteriaDraftMutation();
  const publishMutation = usePublishVersionMutation();
  const createVersionMutation = useCreateVersionMutation();

  const templatesList = templatesQuery.data?.length ? templatesQuery.data : [MOCK_TEMPLATE];
  const libraryCriteria = libraryQuery.data?.length ? libraryQuery.data : MOCK_CRITERIA_LIBRARY;

  const currentTemplate = templateDetailQuery.data || MOCK_TEMPLATE;
  const currentVersion = templateVersionQuery.data || MOCK_VERSION;

  const handleSelectTemplate = (templateId: string, versionId?: string) => {
    setSelectedTemplateId(templateId);
    setSelectedVersionId(versionId || '550e8400-e29b-41d4-a716-446655440000');
    setActiveView('builder');
  };

  const handleCreateNewTemplate = () => {
    setSelectedTemplateId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    setSelectedVersionId('550e8400-e29b-41d4-a716-446655440000');
    setActiveView('builder');
  };

  const handleCreateNewVersion = async (templateId: string) => {
    try {
      await createVersionMutation.mutateAsync({ templateId });
      handleSelectTemplate(templateId, 'ver-2');
    } catch {
      handleSelectTemplate(templateId, 'ver-2');
    }
  };

  const handleSaveDraft = async (updatedCriteria: TemplateCriterion[], expectedVersion: number) => {
    if (selectedTemplateId && selectedVersionId) {
      await saveDraftMutation.mutateAsync({
        templateId: selectedTemplateId,
        versionId: selectedVersionId,
        criteria: updatedCriteria,
        expectedVersion,
      });
    }
  };

  const handlePublishVersion = async (expectedVersion: number) => {
    if (selectedTemplateId && selectedVersionId) {
      await publishMutation.mutateAsync({
        templateId: selectedTemplateId,
        versionId: selectedVersionId,
        expectedVersion,
      });
    }
  };

  if (activeView === 'builder') {
    return (
      <TemplateBuilderWorkspace
        template={currentTemplate}
        version={currentVersion}
        libraryCriteria={libraryCriteria}
        isLoading={false}
        error={null}
        onSaveDraft={handleSaveDraft}
        onPublishVersion={handlePublishVersion}
        onBackToList={() => setActiveView('list')}
        isSavePending={saveDraftMutation.isPending}
        isPublishPending={publishMutation.isPending}
        saveError={saveDraftMutation.error}
      />
    );
  }

  return (
    <TemplateListScreen
      templates={templatesList}
      isLoading={templatesQuery.isLoading && templatesList.length === 0}
      error={templatesQuery.error}
      onSelectTemplate={handleSelectTemplate}
      onCreateNewTemplate={handleCreateNewTemplate}
      onCreateNewVersion={handleCreateNewVersion}
    />
  );
}
