"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState<"rentee" | "landlord">("rentee")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.auth.updateUser({
          data: { role: userRole },
        })

        // Route based on selected role
        if (userRole === "landlord") {
          router.push("/landlord/dashboard")
        } else {
          router.push("/rentee/dashboard")
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">d</span>
              </div>
              <span className="font-bold text-lg">deralal</span>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={userRole}
              onValueChange={(value) =>
                setUserRole(value as "rentee" | "landlord")
              }
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="rentee">Rentee</TabsTrigger>
                <TabsTrigger value="landlord">Landlord</TabsTrigger>
              </TabsList>

              <TabsContent value={userRole}>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-sm">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : `Sign in as ${userRole}`}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={`/auth/sign-up?type=${userRole}`}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Sign up
                    </Link>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
