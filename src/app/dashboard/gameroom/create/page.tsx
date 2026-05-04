"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.push("/dashboard/gameroom/create/mode");
    }, [router]);

    return (
        <div className="flex h-screen bg-[#0d0f14] items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
