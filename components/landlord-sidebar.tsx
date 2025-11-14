"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, Building2, Settings, LogOut, Menu, X, MessageSquare, Building2 as Building2NoFill } from 'lucide-react';
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from 'next/navigation';

export default function LandlordSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/landlord/dashboard" },
    { icon: Plus, label: "Add New Listing", href: "/landlord/create-listing" },
    { icon: Building2NoFill, label: "Available Listings", href: "/landlord/available-listings" },
    { icon: Building2, label: "Taken/Rented Places", href: "/landlord/rented-places" },
    { icon: MessageSquare, label: "Messages", href: "/messages" },
    { icon: Settings, label: "Profile Settings", href: "/landlord/settings" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-primary text-primary-foreground"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 z-30 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border">
          <Link href="/landlord/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">d</span>
            </div>
            <span className="font-bold text-lg text-foreground">deralal</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Landlord Portal</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
