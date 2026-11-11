import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
            {...props}
        />
    )
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul
            className={cn("flex list-none flex-row items-center gap-1 m-0 p-0", className)}
            {...props}
        />
    )
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
    return (
        <li className={cn("list-none", className)} {...props} />
    )
}

type PaginationLinkProps = {
    isActive?: boolean
} & Pick<ButtonProps, "size"> &
    React.ComponentProps<"a">

function PaginationLink({
                            className,
                            isActive,
                            size = "icon",
                            ...props
                        }: PaginationLinkProps) {
    return (
        <a
            aria-current={isActive ? "page" : undefined}
            className={cn(
                buttonVariants({
                    variant: isActive ? "outline" : "ghost",
                    size,
                }),
                "cursor-pointer",
                className
            )}
            {...props}
        />
    )
}

function PaginationPrevious({
                                className,
                                ...props
                            }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Poprzednia strona"
            size="default"
            className={cn("gap-1 pl-2.5 lowercase", className)}
            {...props}
        >
            <ChevronLeft className="h-4 w-4" />
            <span>poprzednia</span>
        </PaginationLink>
    )
}

function PaginationNext({
                            className,
                            ...props
                        }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Nastepna strona"
            size="default"
            className={cn("gap-1 pr-2.5 lowercase", className)}
            {...props}
        >
            <span>nastepna</span>
            <ChevronRight className="h-4 w-4" />
        </PaginationLink>
    )
}

function PaginationEllipsis({
                                className,
                                ...props
                            }: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            className={cn("flex h-9 w-9 items-center justify-center", className)}
            {...props}
        >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Wiecej stron</span>
    </span>
    )
}

export {
    Pagination,
    PaginationContent,
    PaginationLink,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
}