"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import SignUpSuccessLoading from './loading';
import { Suspense } from 'react';

function SignUpSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to confirm your account. It may take a few minutes to arrive.
            </p>
            
            {email && (
              <p className="text-sm text-center font-medium">
                Email: {email}
              </p>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                After confirming your email, you can sign in to start exploring or listing rooms.
              </p>
            </div>

            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpSuccessPage() {
  return (
    <Suspense fallback={<SignUpSuccessLoading />}>
      <SignUpSuccessContent />
    </Suspense>
  );
}
