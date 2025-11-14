"use client";

import { useState, useEffect } from "react";
import LandlordSidebar from "@/components/landlord-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import { createBrowserClient } from "@supabase/ssr";
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function LandlordSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company_name: "",
    address: "",
  });
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.session.user.id)
      .single();

    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        company_name: profile.company_name || "",
        address: profile.address || "",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", session.session.user.id);

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex">
      <LandlordSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account and company information</p>

          {/* Profile Form */}
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              {message && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${message.includes("Error") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"}`}>
                  {message.includes("Error") ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  {message}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Full Name</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Company Name</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Your company name (optional)"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Phone Number</label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Your phone number"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Your address"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h2 className="text-lg font-bold text-foreground mb-4">Danger Zone</h2>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
            >
              Logout
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
