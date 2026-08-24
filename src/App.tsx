import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import {
  AdminRolesPage,
  AdminUserEditPage,
  AdminUsersPage,
} from './pages/AdminPages';
import { AdminDatabasesPage } from './pages/AdminDatabasesPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DiscordAnnouncementsPage } from './pages/discord/DiscordAnnouncementsPage';
import { DiscordLayout } from './pages/discord/DiscordLayout';
import { DiscordLogsPage } from './pages/discord/DiscordLogsPage';
import { DiscordRosterPage } from './pages/discord/DiscordRosterPage';
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
          <Route path="/discord" element={<DiscordLayout />}>
            <Route index element={<Navigate to="announcements" replace />} />
            <Route path="announcements" element={<DiscordAnnouncementsPage />} />
            <Route path="roster" element={<DiscordRosterPage />} />
            <Route path="logs" element={<DiscordLogsPage />} />
          </Route>
          <Route path="/admin" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserEditPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/databases" element={<AdminDatabasesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
