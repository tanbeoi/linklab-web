
import { AuthGuard } from "@/components/auth-guard";

type protectedLayoutProps = {
    children: React.ReactNode;
}

export default function ProtectedLayout({children}: protectedLayoutProps) 
{
    return <AuthGuard>{children}</AuthGuard>;
}