// resources/js/components/app-sidebar.tsx
import { Link } from "@inertiajs/react";
import {
    LayoutGrid,
    Settings,
    Coins,
    Tags,
    FolderTree,
    Package,
    Map,
    HelpCircle,
    Users,
    Store,
    UserCircle,
    ShieldCheck,
    Sparkles,
    Boxes,
} from "lucide-react";
import AppLogo from "@/components/app-logo";
import { NavFooter } from "@/components/nav-footer";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavItem } from "@/types";
import { Wordmark } from "./wordmark";

const mainNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutGrid,
    },
    {
        title: "Parcels",
        href: "/admin/parcels",
        icon: Package,
    },
    {
        title: "Payments",
        href: "/admin/payments",
        icon: Coins,
    },
    {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        children: [
            {
                title: "Admin & Staff",
                href: "/admin/users?role=user",
                icon: ShieldCheck,
            },
            {
                title: "Merchants",
                href: "/admin/users?role=merchant",
                icon: Store,
            },
            {
                title: "Customers",
                href: "/admin/users?role=customer",
                icon: UserCircle,
            },
        ],
    },
    // {
    //     title: "Wallets",
    //     href: "/admin/wallets",
    //     icon: Wallet,
    //     children: [
    //         { title: "Balances", href: "/admin/wallets", icon: Wallet },
    //         {
    //             title: "Withdrawals",
    //             href: "/admin/wallets/withdrawals",
    //             icon: Banknote,
    //         },
    //         {
    //             title: "Transactions",
    //             href: "/admin/wallets/transactions",
    //             icon: Receipt,
    //         },
    //     ],
    // },
    {
        title: "Points",
        href: "/admin/points",
        icon: Sparkles,
    },
    {
        title: "Supply Requests",
        href: "/admin/supply-requests",
        icon: Boxes,
    },
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        children: [
            {
                title: "Pricing Constants",
                href: "/admin/settings/pricing-constants",
                icon: Coins,
            },
            {
                title: "General Prices",
                href: "/admin/settings/general-prices",
                icon: Tags,
            },
            {
                title: "Item Groups",
                href: "/admin/settings/item-groups",
                icon: FolderTree,
            },
            {
                title: "Items",
                href: "/admin/settings/items",
                icon: Package,
            },
            {
                title: "Routes",
                href: "/admin/settings/routes",
                icon: Map,
            },
            {
                title: "FAQs",
                href: "/admin/settings/faqs",
                icon: HelpCircle,
            },
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
                            <Link href={"/admin"} prefetch>
                                {/* <AppLogo /> */}
                                <Wordmark onBand size="text-[1.35rem]" />
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
