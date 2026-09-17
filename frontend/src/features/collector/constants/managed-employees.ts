export interface ManagedEmployee {
  code: string;
  name: string;
  username: string;
  email: string;
  team: 'ALLEGRO NX Part' | 'Maritime Solutions Part';
  role?: string;
}

export const MANAGED_EMPLOYEES: ManagedEmployee[] = [
  // ── ALLEGRO NX Part (12 nhân sự gồm Manager) ──
  { code: '163188', name: 'Lương Công Kỳ', username: 'kyluong', email: 'ky.luong@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Senior Developer / Manager' },
  { code: '173232', name: 'Nguyễn Quang Đức', username: 'ducnguyen', email: 'duc.nguyen@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '183322', name: 'Đào Trung Hiếu', username: 'hieudao', email: 'hieu.dao@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '213813', name: 'Lê Trọng Ân', username: 'anlt', email: 'an.lt@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer' },
  { code: '213866', name: 'Hà Việt Tùng', username: 'tungha', email: 'tung.ha@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '213844', name: 'Lê Minh Hy', username: 'hyle', email: 'hy.le@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '227031', name: 'Trần Quang Diệm', username: 'diemtran', email: 'diem.tran@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '237157', name: 'Nguyễn Bá Ngọc', username: 'ngocnb', email: 'ngoc.nb@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '237196', name: 'Võ Chí Thiện', username: 'thienvo', email: 'thien.vo@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '247203', name: 'Phan Huy Nhân', username: 'nhanph', email: 'nhan.ph@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '247097', name: 'Nguyễn Thành Phước', username: 'phuocnt', email: 'phuoc.nt@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '203701', name: 'Phạm Mai Nhật', username: 'nhatpham', email: 'nhat.pham@cyberlogitec.com', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },

  // ── Maritime Solutions Part (8 nhân sự) ──
  { code: '203755', name: 'Thái Thanh Xuân', username: 'xuanthai', email: 'xuan.thai@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247204', name: 'Nguyễn Sỹ Hoàng Lâm', username: 'lamnsh', email: 'lam.nsh@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247222', name: 'Phạm Hữu Thắng', username: 'thangph', email: 'thang.ph@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247423', name: 'Chung Quang Phương', username: 'phuongcq', email: 'phuong.cq@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '267036', name: 'Đặng Phước Khoa', username: 'khoadang', email: 'khoa.dang@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '213835', name: 'Đoàn Anh Minh', username: 'minhdoan', email: 'minh.doan@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '193613', name: 'Nguyễn Quang Trung', username: 'trungqn', email: 'trung.nguyenquang@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '257130', name: 'Nguyễn Minh Quang', username: 'quangng', email: 'quang.ng@cyberlogitec.com', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
];
