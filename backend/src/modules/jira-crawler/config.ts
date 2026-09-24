
export interface ManagedMember {
  code: string;
  name: string;
  email: string;
  team: 'ALLEGRO' | 'MARITIME';
}

export const MANAGED_MEMBERS: ManagedMember[] = [
  // ── Allegro NX Part ──
  { code: '173232', name: 'Nguyễn Quang Đức', email: 'duc.nguyen@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '183322', name: 'Đào Trung Hiếu', email: 'hieu.dao@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '213813', name: 'Lê Trọng Ân', email: 'an.lt@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '213866', name: 'Hà Việt Tùng', email: 'tung.ha@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '213844', name: 'Lê Minh Hy', email: 'hy.le@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '227031', name: 'Trần Quang Diệm', email: 'diem.tran@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '237157', name: 'Nguyễn Bá Ngọc', email: 'ngoc.nb@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '237196', name: 'Võ Chí Thiện', email: 'thien.vo@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '247203', name: 'Phan Huy Nhân', email: 'nhan.ph@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '247097', name: 'Nguyễn Thành Phước', email: 'phuoc.nt@cyberlogitec.com', team: 'ALLEGRO' },
  { code: '203701', name: 'Phạm Mai Nhật', email: 'nhat.pham@cyberlogitec.com', team: 'ALLEGRO' },

  // ── Maritime Solutions Part ──
  { code: '203755', name: 'Thái Thanh Xuân', email: 'xuan.thai@cyberlogitec.com', team: 'MARITIME' },
  { code: '247204', name: 'Nguyễn Sỹ Hoàng Lâm', email: 'lam.nsh@cyberlogitec.com', team: 'MARITIME' },
  { code: '247222', name: 'Phạm Hữu Thắng', email: 'thang.ph@cyberlogitec.com', team: 'MARITIME' },
  { code: '247423', name: 'Chung Quang Phương', email: 'phuong.cq@cyberlogitec.com', team: 'MARITIME' },
  { code: '267036', name: 'Đặng Phước Khoa', email: 'khoa.dang@cyberlogitec.com', team: 'MARITIME' },
  { code: '213835', name: 'Đoàn Anh Minh', email: 'minh.doan@cyberlogitec.com', team: 'MARITIME' },
  { code: '193613', name: 'Nguyễn Quang Trung', email: 'trung.nguyenquang@cyberlogitec.com', team: 'MARITIME' },
  { code: '257130', name: 'Nguyễn Minh Quang', email: 'quang.ng@cyberlogitec.com', team: 'MARITIME' },
];

export const JIRA_CONFIG = {
  baseUrl: process.env.JIRA_BASE_URL || 'https://pim.cyberlogitec.com/jira',
  username: process.env.JIRA_USERNAME || 'ky.luong',
  password: process.env.JIRA_PASSWORD || 'P210831!',
  managerName: process.env.JIRA_MANAGER_NAME || 'Lương Công Kỳ',
  managerCode: process.env.JIRA_MANAGER_CODE || '163188',
  defaultCycleCode: process.env.JIRA_DEFAULT_CYCLE_CODE || '2026-H2',
};
