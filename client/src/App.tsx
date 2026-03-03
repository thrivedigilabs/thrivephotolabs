import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/layout/AuthGuard';
import AppShell from './components/layout/AppShell';
import { ToastContainer } from './components/ui/Toast';
import { AdminRoute } from './middleware/AdminRoute';

function App() {
    return (
        <AuthGuard>
            <Routes>
                {/* Main App Routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AppShell />} />
                <Route path="/optimize" element={<AppShell />} />
                <Route path="/ai-organize" element={<AppShell />} />
                <Route path="/drive" element={<AppShell />} />
                <Route path="/shopify" element={<AppShell />} />
                <Route path="/billing" element={<AppShell />} />
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AppShell />
                        </AdminRoute>
                    }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <ToastContainer />
        </AuthGuard>
    );
}

export default App;
