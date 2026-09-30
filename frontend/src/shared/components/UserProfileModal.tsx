import React, { useState, useRef } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { authApi } from '@/shared/api/auth-api';
import { useTheme } from '@/shared/theme';
import {
  X,
  User,
  Camera,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Mail,
  BadgeCheck,
  Upload,
  Trash2,
  KeyRound,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'avatar' | 'password';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: 'Chưa nhập', color: '#94a3b8' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score: 1, label: 'Yếu', color: '#ef4444' };
  if (score <= 3) return { score: 2, label: 'Trung bình', color: '#f59e0b' };
  return { score: 3, label: 'Rất mạnh', color: '#10b981' };
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const strength = calculatePasswordStrength(newPassword);

  // Handle avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn file hình ảnh (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Kích thước ảnh tối đa là 3MB.');
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = () => {
    try {
      updateUserProfile?.({ avatarUrl: avatarPreview || undefined });
      setAvatarSuccess('Cập nhật ảnh đại diện thành công!');
      setTimeout(() => setAvatarSuccess(null), 3000);
    } catch (_e) {
      void _e;
      setAvatarError('Không thể lưu ảnh đại diện. Vui lòng thử lại.');
    }
  };

  const handleResetAvatar = () => {
    setAvatarPreview(null);
    updateUserProfile?.({ avatarUrl: undefined });
    setAvatarSuccess('Đã đặt lại ảnh đại diện về mặc định.');
    setTimeout(() => setAvatarSuccess(null), 3000);
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }

    setPassLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPassSuccess('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = errObj.response?.data?.message || errObj.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      setPassError(msg);
    } finally {
      setPassLoading(false);
    }
  };

  const currentAvatar = avatarPreview || user.avatarUrl;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & User Banner */}
        <div
          style={{
            padding: '20px 24px',
            background: isDark
              ? 'linear-gradient(135deg, #1e1b4b, #111827)'
              : 'linear-gradient(135deg, #eef2ff, #f8fafc)',
            borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar Pill */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: currentAvatar ? undefined : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '18px',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(user.name)
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {user.name}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                    color: isDark ? '#a5b4fc' : '#4338ca',
                    border: `1px solid ${isDark ? '#4338ca' : '#c7d2fe'}`,
                  }}
                >
                  {user.role}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
            padding: '0 16px',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              color: activeTab === 'profile' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'),
              borderBottom: activeTab === 'profile' ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <User size={15} />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('avatar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'avatar' ? 700 : 500,
              color: activeTab === 'avatar' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'),
              borderBottom: activeTab === 'avatar' ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Camera size={15} />
            <span>Ảnh đại diện</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'password' ? 700 : 500,
              color: activeTab === 'password' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'),
              borderBottom: activeTab === 'password' ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Lock size={15} />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: Profile Overview */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                    <User size={13} />
                    <span>Họ và tên</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {user.name}
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                    <Mail size={13} />
                    <span>Email liên hệ</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {user.email}
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                    <BadgeCheck size={13} />
                    <span>Mã nhân sự (ID)</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {user.employeeId || 'Chưa thiết lập'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                    <Shield size={13} />
                    <span>Vai trò hệ thống</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#818cf8' : '#4f46e5' }}>
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                  border: `1px solid ${isDark ? '#059669' : '#a7f3d0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: '13px', color: isDark ? '#a7f3d0' : '#065f46', fontWeight: 500 }}>
                  Tài khoản đang hoạt động bình thường với đầy đủ đặc quyền quản trị theo vai trò.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Upload Avatar */}
          {activeTab === 'avatar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              {avatarSuccess && (
                <div
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{avatarSuccess}</span>
                </div>
              )}

              {avatarError && (
                <div
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{avatarError}</span>
                </div>
              )}

              {/* Big Avatar Preview */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: currentAvatar ? undefined : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '36px',
                    border: `4px solid ${isDark ? '#374151' : '#e0e7ff'}`,
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
                    overflow: 'hidden',
                  }}
                >
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={user.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Tải ảnh mới từ máy tính"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  <Upload size={14} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b' }}>
                  Tải lên ảnh chân dung của bạn
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Hỗ trợ định dạng PNG, JPG hoặc WebP. Dung lượng khuyến nghị dưới 3MB.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={14} />
                  <span>Chọn ảnh từ máy</span>
                </button>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Lưu ảnh đại diện</span>
                  </button>
                )}

                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Gỡ ảnh</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Change Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {passSuccess && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{passError}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                  Mật khẩu hiện tại <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu bạn đang sử dụng..."
                    required
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                  Mật khẩu mới <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    required
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPassword && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>Độ mạnh mật khẩu:</span>
                      <strong style={{ color: strength.color }}>{strength.label}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                      <div
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: strength.score >= 1 ? strength.color : (isDark ? '#374151' : '#e2e8f0'),
                          transition: 'all 0.2s',
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: strength.score >= 2 ? strength.color : (isDark ? '#374151' : '#e2e8f0'),
                          transition: 'all 0.2s',
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: strength.score >= 3 ? strength.color : (isDark ? '#374151' : '#e2e8f0'),
                          transition: 'all 0.2s',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                  Xác nhận mật khẩu mới <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    required
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${
                        confirmPassword && newPassword
                          ? confirmPassword === newPassword
                            ? '#10b981'
                            : '#ef4444'
                          : isDark
                          ? '#374151'
                          : '#cbd5e1'
                      }`,
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    Mật khẩu xác nhận chưa khớp.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={passLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor:
                      passLoading || !currentPassword || !newPassword || newPassword !== confirmPassword
                        ? '#94a3b8'
                        : '#4f46e5',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor:
                      passLoading || !currentPassword || !newPassword || newPassword !== confirmPassword
                        ? 'not-allowed'
                        : 'pointer',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <KeyRound size={14} />
                  <span>{passLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
