import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import {
  AdminRolesPage,
  AdminUserEditPage,
  AdminUsersPage,
} from './pages/AdminPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DiscordPage } from './pages/DiscordPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/discord" element={<DiscordPage />} />
          <Route path="/admin" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserEditPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
