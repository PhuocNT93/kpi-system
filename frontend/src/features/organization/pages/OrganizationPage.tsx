import { useState } from 'react';
import { OrgStructureTab } from '../components/OrgStructureTab';
import { JobArchitectureTab } from '../components/JobArchitectureTab';
import { SubTabs } from '../../../shared/ui/SubTabs/SubTabs';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

type Tab = 'structure' | 'architecture';

// Rendered only inside the System & Security Hub, which already shows the page title.
export function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const { t } = useOrganizationTranslation();

  return (
    <div className="fill-column">
      <SubTabs<Tab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'structure', label: t('tab_org_structure', 'Org Structure') },
          { id: 'architecture', label: t('tab_job_architecture', 'Job Architecture') },
        ]}
      />

      {activeTab === 'structure' && <OrgStructureTab />}
      {activeTab === 'architecture' && <JobArchitectureTab />}
    </div>
  );
}
