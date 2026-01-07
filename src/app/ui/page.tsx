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
import { SearchBar } from "@/components/SearchBar";
import { QuestionInput } from "@/components/QuestionInput";
import { OrnamentalDivider } from "@/components/ui/ornamental-divider";

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

function TextStylesSection() {
  return (
    <Section title="Text Styles">
      <div className="grid gap-6">
        <ExampleGroup label="text-h1">
          <h1 className="text-h1">Heading 1</h1>
        </ExampleGroup>
        <ExampleGroup label="text-h2">
          <h2 className="text-h2">Heading 2</h2>
        </ExampleGroup>
        <ExampleGroup label="text-h3">
          <h3 className="text-h3">Heading 3</h3>
        </ExampleGroup>
        <ExampleGroup label="text-subhead">
          <p className="text-subhead">Subhead Text</p>
        </ExampleGroup>
        <ExampleGroup label="text-paragraph-bold">
          <p className="text-paragraph-bold">Bold Paragraph Text</p>
        </ExampleGroup>
        <ExampleGroup label="text-paragraph">
          <p className="text-paragraph">Regular Paragraph Text</p>
        </ExampleGroup>
        <ExampleGroup label="text-paragraph-sm">
          <p className="text-paragraph-sm">Small Paragraph Text</p>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function ColorsSection() {
  const stoneColors = [
    { name: "stone-50", hex: "#FAFAF9", class: "bg-stone-50" },
    { name: "stone-100", hex: "#F5F5F4", class: "bg-stone-100" },
    { name: "stone-200", hex: "#EBE8E6", class: "bg-stone-200" },
    { name: "stone-300", hex: "#D6D3D1", class: "bg-stone-300" },
    { name: "stone-400", hex: "#A6A09B", class: "bg-stone-400" },
    { name: "stone-500", hex: "#79716B", class: "bg-stone-500" },
    { name: "stone-600", hex: "#57534D", class: "bg-stone-600" },
    { name: "stone-800", hex: "#292524", class: "bg-stone-800" },
  ];

  const brassColors = [
    { name: "brass-300", hex: "#A08151", class: "bg-brass-300" },
    { name: "brass-400", hex: "#715936", class: "bg-brass-400" },
    { name: "brass-450", hex: "#61441A", class: "bg-brass-450" },
  ];

  const beigeColors = [
    { name: "beige-100", hex: "#F7F4EE", class: "bg-beige-100" },
  ];

  const semanticColors = [
    { name: "primary", hex: "#715936", class: "bg-primary" },
    { name: "primary-foreground", hex: "#FFFFFF", class: "bg-primary-foreground" },
    { name: "secondary", hex: "#F5F5F4", class: "bg-secondary" },
    { name: "secondary-foreground", hex: "#292524", class: "bg-secondary-foreground" },
    { name: "muted", hex: "#F7F4EE", class: "bg-muted" },
    { name: "muted-foreground", hex: "#57534D", class: "bg-muted-foreground" },
    { name: "accent", hex: "#EBE8E6", class: "bg-accent" },
    { name: "accent-foreground", hex: "#292524", class: "bg-accent-foreground" },
    { name: "destructive", hex: "#61441A", class: "bg-destructive" },
    { name: "background", hex: "#F7F4EE", class: "bg-background" },
    { name: "foreground", hex: "#292524", class: "bg-foreground" },
    { name: "card", hex: "#FFFFFF", class: "bg-card" },
    { name: "card-foreground", hex: "#292524", class: "bg-card-foreground" },
    { name: "popover", hex: "#FFFFFF", class: "bg-popover" },
    { name: "popover-foreground", hex: "#292524", class: "bg-popover-foreground" },
    { name: "border", hex: "#D6D3D1", class: "bg-border" },
    { name: "input", hex: "#D6D3D1", class: "bg-input" },
    { name: "ring", hex: "#715936", class: "bg-ring" },
  ];

  const gradients = [
    {
      name: "brass-gradient",
      hex: "linear-gradient(to right, #A08151, #715936)",
      class: "brass-gradient",
    },
    {
      name: "brass-gradient-hover",
      hex: "linear-gradient(to right, #917549, #61441A)",
      class: "brass-gradient-hover",
    },
    {
      name: "brass-gradient-light",
      hex: "linear-gradient(to right, #D2BB9A, #A48B64)",
      class: "brass-gradient-light",
    },
    {
      name: "text-brass-gradient",
      hex: "linear-gradient(to right, #A08151, #715936)",
      class: "text-brass-gradient",
      isText: true,
    },
  ];

  function ColorSwatch({
    name,
    hex,
    class: className,
    isGradient = false,
    isText = false,
  }: {
    name: string;
    hex: string;
    class: string;
    isGradient?: boolean;
    isText?: boolean;
  }) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="h-16 w-full rounded-md border border-stone-300"
          style={
            isGradient
              ? { background: hex }
              : isText
                ? {}
                : { backgroundColor: hex }
          }
        >
          {isText && (
            <div className="flex h-full items-center justify-center">
              <span className={className}>Brass Gradient</span>
            </div>
          )}
        </div>
        <div className="text-xs">
          <div className="font-medium">{name}</div>
          <div className="text-stone-500">{hex}</div>
          <div className="text-stone-400">{className}</div>
        </div>
      </div>
    );
  }

  return (
    <Section title="Colors">
      <div className="grid gap-8">
        {/* Stone Colors */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Stone Colors</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {stoneColors.map((color) => (
              <ColorSwatch key={color.name} {...color} />
            ))}
          </div>
        </div>

        {/* Brass Colors */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Brass Colors</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3">
            {brassColors.map((color) => (
              <ColorSwatch key={color.name} {...color} />
            ))}
          </div>
        </div>

        {/* Beige Colors */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Beige Colors</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {beigeColors.map((color) => (
              <ColorSwatch key={color.name} {...color} />
            ))}
          </div>
        </div>

        {/* Semantic Colors */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">
            Semantic Colors
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {semanticColors.map((color) => (
              <ColorSwatch key={color.name} {...color} />
            ))}
          </div>
        </div>

        {/* Gradients */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-stone-600">Gradients</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {gradients.map((gradient) => (
              <ColorSwatch
                key={gradient.name}
                name={gradient.name}
                hex={gradient.hex}
                class={gradient.class}
                isGradient={true}
                isText={gradient.isText}
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
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
              <Button size="icon-sm" variant="secondary">
                <SettingsIcon />
              </Button>
            </ExampleGroup>
            <ExampleGroup label="icon">
              <Button size="icon" variant="secondary">
                <SettingsIcon />
              </Button>
            </ExampleGroup>
            <ExampleGroup label="icon-lg">
              <Button size="icon-lg" variant="secondary">
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
              <Button variant="secondary">
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
              <Button variant="secondary">Open Dialog</Button>
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
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ExampleGroup>

        <ExampleGroup label="without close button">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">No Close Button</Button>
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
                  <Button variant="secondary">No</Button>
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

        <ExampleGroup label="full width (try typing to see dropdown)">
          <div className="w-full max-w-md">
            <SearchBar />
          </div>
        </ExampleGroup>
      </div>
    </Section>
  );
}

function QuestionInputSection() {
  return (
    <Section title="QuestionInput">
      <div className="grid gap-6">
        <ExampleGroup label="default">
          <div className="w-full max-w-md">
            <QuestionInput onSubmit={(v) => toast.success(`Submitted: ${v}`)} />
          </div>
        </ExampleGroup>

        <ExampleGroup label="disabled">
          <div className="w-full max-w-md">
            <QuestionInput disabled />
          </div>
        </ExampleGroup>

        <ExampleGroup label="full width">
          <QuestionInput onSubmit={(v) => toast.success(`Submitted: ${v}`)} />
        </ExampleGroup>
      </div>
    </Section>
  );
}

function OrnamentalDividerSection() {
  return (
    <Section title="Ornamental Divider">
      <div className="grid gap-6">
        <ExampleGroup label="fill container">
          <div className="w-full max-w-2xl">
            <OrnamentalDivider />
          </div>
        </ExampleGroup>
      </div>
    </Section>
  );
}

export default function UIPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold">UI Components</h1>
          <p className="mt-2 text-stone-600">
            A showcase of all available UI components and their variants.
          </p>
        </header>

        <main>
          <TextStylesSection />
          <ColorsSection />
          <ButtonSection />
          <CardSection />
          <CommandSection />
          <DialogSection />
          <InputSection />
          <QuestionInputSection />
          <SearchBarSection />
          <SkeletonSection />
          <OrnamentalDividerSection />
        </main>
      </div>
    </div>
  );
}



