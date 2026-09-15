export interface ManagedEmployee {
  code: string;
  name: string;
  username: string;
  team: 'ALLEGRO NX Part' | 'Maritime Solutions Part';
  role?: string;
}

export const MANAGED_EMPLOYEES: ManagedEmployee[] = [
  // ── ALLEGRO NX Part (12 nhân sự) ──
  { code: '213813', name: 'An Le Trong', username: 'anlt', team: 'ALLEGRO NX Part', role: 'Developer' },
  { code: '227031', name: 'Diem Tran', username: 'diemtran', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '173232', name: 'Duc Nguyen', username: 'ducnguyen', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '183322', name: 'Hieu Dao', username: 'hieudao', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '213844', name: 'Hy Le', username: 'hyle', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '163188', name: 'Ky Luong', username: 'kyluong', team: 'ALLEGRO NX Part', role: 'Senior Developer / Manager' },
  { code: '237157', name: 'Ngoc Nguyen Ba', username: 'ngocnb', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '247203', name: 'Nhan Phan Huy', username: 'nhanph', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '203701', name: 'Nhat Pham', username: 'nhatpham', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '247097', name: 'Phuoc Nguyen Thanh', username: 'phuocnt', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },
  { code: '237196', name: 'Thien Vo', username: 'thienvo', team: 'ALLEGRO NX Part', role: 'Người đăng kí / Requester' },
  { code: '213866', name: 'Tung Ha', username: 'tungha', team: 'ALLEGRO NX Part', role: 'Developer / PIC' },

  // ── Maritime Solutions Part (9 nhân sự) ──
  { code: '267036', name: 'Khoa Dang', username: 'khoadang', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247204', name: 'Lam Nguyen Sy Hoang', username: 'lamnguyen', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '213835', name: 'Minh Doan', username: 'minhdoan', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247054', name: 'Nam Nguyen Doan', username: 'namnguyen', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247423', name: 'Phuong Chung Quang', username: 'phuongcq', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '257130', name: 'Quang Nguyen', username: 'quangnguyen', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '247222', name: 'Thang Pham Huu', username: 'thangpham', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '193613', name: 'Trung Quang Nguyen', username: 'trungqn', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
  { code: '203755', name: 'Xuan Thai', username: 'xuanthai', team: 'Maritime Solutions Part', role: 'Developer / PIC' },
];
