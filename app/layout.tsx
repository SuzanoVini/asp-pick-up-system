import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";
import { Header } from "./components/layout/header";
import { Sidebar } from "./components/layout/sidebar";

const fraunces = Fraunces({
	variable: "--font-fraunces",
	subsets: ["latin"],
});
const karla = Karla({
	variable: "--font-karla",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: process.env.NEXT_PUBLIC_APP_NAME || "ASP Manager",
	description: "After School Program Pick-Up Management System",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${fraunces.variable} ${karla.variable} antialiased`}>
				<div className="flex h-screen overflow-hidden">
					<Sidebar />
					<div className="flex flex-1 flex-col overflow-hidden">
						<Header />
						<main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
					</div>
				</div>
			</body>
		</html>
	);
}
