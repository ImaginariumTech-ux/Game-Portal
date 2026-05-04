
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // 2. Refresh Session
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Protect Admin Routes
    // If trying to access /magicadmins/dashboard/* and NOT logged in, redirect to login
    if (request.nextUrl.pathname.startsWith('/magicadmins/dashboard') ||
        request.nextUrl.pathname.startsWith('/magicadmins/games') ||
        request.nextUrl.pathname.startsWith('/magicadmins/users') ||
        request.nextUrl.pathname.startsWith('/magicadmins/subadmins') ||
        request.nextUrl.pathname.startsWith('/magicadmins/collections')
    ) {
        if (!user) {
            return NextResponse.redirect(new URL('/magicadmins', request.url))
        }

        // Optional: Check if user has 'admin' role (needs DB query or custom claim)
        // For MVP, just checking if authenticated is a good start, but strictly we should check profile role.
        // middleware is edge, so DB queries are trickier. 
        // We will rely on row-level security (RLS) and client-side checks for specific admin data,
        // but basic access to the page is gated by auth here.
    }

    // 4. Protect User Dashboard Routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // If trying to access login page while logged in, redirect to dashboard
    if (request.nextUrl.pathname === '/magicadmins' && user) {
        return NextResponse.redirect(new URL('/magicadmins/dashboard', request.url))
    }

    if (request.nextUrl.pathname === '/' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
