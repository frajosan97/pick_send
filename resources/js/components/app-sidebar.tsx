// resources/js/components/app-sidebar.tsx
import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Settings,
    Coins,
    Tags,
    FolderTree,
    Package,
    Map,
    HelpCircle,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import { dashboard } from '@/routes';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Settings',
        href: '/admin',
        icon: Settings,
        children: [
            {
                title: 'Pricing Constants',
                href: '/admin/pricing-constants',
                icon: Coins,
            },
            {
                title: 'General Prices',
                href: '/admin/general-prices',
                icon: Tags,
            },
            {
                title: 'Item Groups',
                href: '/admin/item-groups',
                icon: FolderTree,
            },
            { title: 'Items', href: '/admin/items', icon: Package },
            { title: 'Routes', href: '/admin/routes', icon: Map },
            { title: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
        ],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
