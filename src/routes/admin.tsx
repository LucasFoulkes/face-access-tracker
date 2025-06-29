import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { BarChart3, FileText, Settings } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarProvider,
    SidebarTrigger,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarInset,
} from '@/components/ui/sidebar'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const items = [
    {
        title: "Reportes",
        to: "/admin/reportes" as const,
        icon: BarChart3,
    },
    {
        title: "Acciones",
        to: "/admin/acciones" as const,
        icon: Settings,
    },
    {
        title: "Tablas",
        to: "/admin/tablas" as const,
        icon: FileText,
    },
]
import { Separator } from '@/components/ui/separator'

function AdminLayout() {
    const location = useLocation()

    // Get the current page name from the pathname
    const getPageName = (pathname: string) => {
        if (pathname === '/admin/reportes') return 'Reportes'
        if (pathname === '/admin/acciones') return 'Acciones'
        if (pathname === '/admin/tablas') return 'Tablas'
        return 'Admin'
    }

    const currentPage = getPageName(location.pathname)

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Application</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <Link to={item.to}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarRail />
            </Sidebar>
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link to="/admin/reportes">Admin</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider >
    )
}

export const Route = createFileRoute('/admin')({
    component: AdminLayout,
    beforeLoad: ({ location }) => {
        // If we're at exactly /admin, redirect to /admin/reportes
        if (location.pathname === '/admin') {
            throw redirect({
                to: '/admin/reportes',
            })
        }
    },
})
