"use client";

import { toast } from "sonner";
import { MailIcon, SearchIcon, SettingsIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { SearchBar } from "@/components/SearchBar";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-stone-300 py-12">
      <h2 className="mb-6 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ExampleGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-stone-500">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function ButtonSection() {
  return (
    <Section title="Button">
      <div className="grid gap-6">
        {/* Variants */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Variants</h3>
          <div className="flex flex-wrap gap-4">
            <ExampleGroup label="default">
              <Button variant="default">Default</Button>
            </ExampleGroup>
            <ExampleGroup label="destructive">
              <Button variant="destructive">Destructive</Button>
            </ExampleGroup>
            <ExampleGroup label="outline">
              <Button variant="outline">Outline</Button>
            </ExampleGroup>
            <ExampleGroup label="secondary">
              <Button variant="secondary">Secondary</Button>
            </ExampleGroup>
            <ExampleGroup label="ghost">
              <Button variant="ghost">Ghost</Button>
            </ExampleGroup>
            <ExampleGroup label="link">
              <Button variant="link">Link</Button>
            </ExampleGroup>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Sizes</h3>
          <div className="flex flex-wrap items-end gap-4">
            <ExampleGroup label="sm">
              <Button size="sm">Small</Button>
            </ExampleGroup>
            <ExampleGroup label="default">
              <Button size="default">Default</Button>
            </ExampleGroup>
            <ExampleGroup label="lg">
              <Button size="lg">Large</Button>
            </ExampleGroup>
          </div>
        </div>

        {/* Icon buttons */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">
            Icon Buttons
          </h3>
          <div className="flex flex-wrap items-end gap-4">
            <ExampleGroup label="icon-sm">
              <Button size="icon-sm" variant="outline">
                <SettingsIcon />
              </Button>
            </ExampleGroup>
            <ExampleGroup label="icon">
              <Button size="icon" variant="outline">
                <SettingsIcon />
              </Button>
            </ExampleGroup>
            <ExampleGroup label="icon-lg">
              <Button size="icon-lg" variant="outline">
                <SettingsIcon />
              </Button>
            </ExampleGroup>
          </div>
        </div>

        {/* With icons */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">With Icons</h3>
          <div className="flex flex-wrap gap-4">
            <ExampleGroup label="leading icon">
              <Button>
                <MailIcon />
                Send Email
              </Button>
            </ExampleGroup>
            <ExampleGroup label="trailing icon">
              <Button variant="outline">
                Settings
                <SettingsIcon />
              </Button>
            </ExampleGroup>
          </div>
        </div>

        {/* States */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">States</h3>
          <div className="flex flex-wrap gap-4">
            <ExampleGroup label="disabled">
              <Button disabled>Disabled</Button>
            </ExampleGroup>
          </div>
        </div>
      </div>
    </Section>
  );
}

function CardSection() {
  return (
    <Section title="Card">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ExampleGroup label="basic">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description goes here.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">
                This is the card content area.
              </p>
            </CardContent>
          </Card>
        </ExampleGroup>

        <ExampleGroup label="with footer">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>With Footer</CardTitle>
              <CardDescription>A card with a footer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">Card content here.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </ExampleGroup>

        <ExampleGroup label="with action">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>With Action</CardTitle>
              <CardDescription>A card with a header action.</CardDescription>
              <CardAction>
                <Button size="icon-sm" variant="ghost">
                  <SettingsIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">Card content here.</p>
            </CardContent>
          </Card>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function CommandSection() {
  return (
    <Section title="Command">
      <div className="grid gap-6 md:grid-cols-2">
        <ExampleGroup label="inline command">
          <Command className="w-full rounded-lg border shadow-md">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <SearchIcon />
                  <span>Search</span>
                </CommandItem>
                <CommandItem>
                  <UserIcon />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <SettingsIcon />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem>
                  <MailIcon />
                  <span>Send Email</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function DialogSection() {
  return (
    <Section title="Dialog">
      <div className="flex flex-wrap gap-4">
        <ExampleGroup label="basic dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog description. Make changes to your profile
                  here.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-stone-600">Dialog content goes here.</p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ExampleGroup>

        <ExampleGroup label="without close button">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">No Close Button</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Confirmation</DialogTitle>
                <DialogDescription>
                  Are you sure you want to proceed?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">No</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Yes</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function InputSection() {
  return (
    <Section title="Input">
      <div className="grid max-w-md gap-6">
        <ExampleGroup label="default">
          <Input placeholder="Default input" className="w-full" />
        </ExampleGroup>

        <ExampleGroup label="with value">
          <Input defaultValue="Hello world" className="w-full" />
        </ExampleGroup>

        <ExampleGroup label="disabled">
          <Input disabled placeholder="Disabled input" className="w-full" />
        </ExampleGroup>

        <ExampleGroup label="type=password">
          <Input
            type="password"
            placeholder="Enter password"
            className="w-full"
          />
        </ExampleGroup>

        <ExampleGroup label="type=email">
          <Input
            type="email"
            placeholder="email@example.com"
            className="w-full"
          />
        </ExampleGroup>

        <ExampleGroup label="type=file">
          <Input type="file" className="w-full" />
        </ExampleGroup>
      </div>
    </Section>
  );
}

function SkeletonSection() {
  return (
    <Section title="Skeleton">
      <div className="grid gap-6">
        <ExampleGroup label="text line">
          <Skeleton className="h-4 w-48" />
        </ExampleGroup>

        <ExampleGroup label="paragraph">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        </ExampleGroup>

        <ExampleGroup label="avatar">
          <Skeleton className="h-12 w-12 rounded-full" />
        </ExampleGroup>

        <ExampleGroup label="card">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </ExampleGroup>

        <ExampleGroup label="image">
          <Skeleton className="h-32 w-48 rounded-md" />
        </ExampleGroup>
      </div>
    </Section>
  );
}

function SearchBarSection() {
  return (
    <Section title="SearchBar">
      <div className="grid gap-6">
        <ExampleGroup label="default">
          <SearchBar />
        </ExampleGroup>

        <ExampleGroup label="custom placeholder">
          <SearchBar placeholder="Search rulebooks..." />
        </ExampleGroup>

        <ExampleGroup label="full width (try typing to see dropdown)">
          <div className="w-full max-w-md">
            <SearchBar />
          </div>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function SonnerSection() {
  return (
    <Section title="Sonner (Toast)">
      <div className="flex flex-wrap gap-4">
        <ExampleGroup label="success">
          <Button
            variant="outline"
            onClick={() => toast.success("Success! Operation completed.")}
          >
            Show Success
          </Button>
        </ExampleGroup>

        <ExampleGroup label="error">
          <Button
            variant="outline"
            onClick={() => toast.error("Error! Something went wrong.")}
          >
            Show Error
          </Button>
        </ExampleGroup>

        <ExampleGroup label="info">
          <Button
            variant="outline"
            onClick={() => toast.info("Info: Here's some information.")}
          >
            Show Info
          </Button>
        </ExampleGroup>

        <ExampleGroup label="warning">
          <Button
            variant="outline"
            onClick={() => toast.warning("Warning: Be careful!")}
          >
            Show Warning
          </Button>
        </ExampleGroup>

        <ExampleGroup label="loading">
          <Button
            variant="outline"
            onClick={() => {
              const id = toast.loading("Loading...");
              setTimeout(() => toast.dismiss(id), 2000);
            }}
          >
            Show Loading
          </Button>
        </ExampleGroup>

        <ExampleGroup label="with description">
          <Button
            variant="outline"
            onClick={() =>
              toast("Event Created", {
                description: "Your event has been scheduled for tomorrow.",
              })
            }
          >
            With Description
          </Button>
        </ExampleGroup>
      </div>
    </Section>
  );
}

export default function UIPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Toaster />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold">UI Components</h1>
          <p className="mt-2 text-stone-600">
            A showcase of all available UI components and their variants.
          </p>
        </header>

        <main>
          <ButtonSection />
          <CardSection />
          <CommandSection />
          <DialogSection />
          <InputSection />
          <SearchBarSection />
          <SkeletonSection />
          <SonnerSection />
        </main>
      </div>
    </div>
  );
}



