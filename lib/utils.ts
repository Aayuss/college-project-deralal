import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your production URL in Vercel Env Vars
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel during deploy
    "http://localhost:3000/" // Default to localhost

  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`

  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`

  return url
}
