import { Inter } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata = {
    title: "CoWatch - YouTube Watch Party",
    description: "Real-time synchronized YouTube watch parties with role-based access control.",
};

export const viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark-mode" style={{ colorScheme: "dark" }} suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary text-primary antialiased")}>
                <RouteProvider>
                    <Theme>{children}</Theme>
                </RouteProvider>
            </body>
        </html>
    );
}

