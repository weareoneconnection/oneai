"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function VerifyPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge>Auth</Badge>
            <Badge>Magic Link</Badge>
          </div>
          <CardTitle className="mt-3">Check your email</CardTitle>
          <CardDescription>
            A secure sign-in link has been sent to your inbox.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-black/70">
          <div>
            Open your email and click the link to complete sign-in.
          </div>

          <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-black/60">
            Didn’t receive it? Check your spam folder or try signing in again.
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.location.href = "/login"}>
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}