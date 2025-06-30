import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { BarChart3, FileText, Settings, ChevronLeft } from "lucide-react"
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
    SidebarHeader,
    SidebarFooter,
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
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Settings className="h-4 w-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">Admin</span>
                                    <span className="truncate text-xs">Panel de Control</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                asChild
                            >
                                <Link to="/">
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="bg-muted text-muted-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                            <ChevronLeft className="h-4 w-4" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">Volver</span>
                                            <span className="truncate text-xs">Ir al inicio</span>
                                        </div>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <SidebarInset className='flex-1 flex flex-col h-screen'>
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
                <div className="flex flex-1 flex-col p-4 overflow-hidden pt-0">
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
