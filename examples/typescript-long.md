# TypeScript Long Transition Sample

Each block changes something small to exercise transitions.

```ts
export type User = {
  id: string
}
```

```ts
export type User = {
  id: string
  name: string
}
```

```ts
export type User = {
  id: string
  name: string
  email: string
}
```

```ts
export type User = {
  id: string
  name: string
  email: string
}

export const greet = (user: User): string => {
  return `Hello, ${user.name}!`
}
```

```ts
export type User = {
  id: string
  name: string
  email: string
}

export const greet = (user: User): string => `Hello, ${user.name}!`
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
}

export const greet = (user: User): string => `Hello, ${user.name}!`
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const isActiveLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")

export const buildUserLabel = (user: User): string => `${user.name} · ${user.role.toUpperCase()}`
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")

export const buildUserLabel = (user: User): string => `${user.name} · ${user.role.toUpperCase()}`

export const isCompleteProfile = (user: User): boolean => Boolean(user.name && user.email)
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")

export const buildUserLabel = (user: User): string => `${user.name} · ${user.role.toUpperCase()}`

export const isCompleteProfile = (user: User): boolean => Boolean(user.name && user.email)

export const setLastLogin = (user: User, date: Date): User => ({
  ...user,
  lastLoginAt: date,
})
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")

export const buildUserLabel = (user: User): string => `${user.name} · ${user.role.toUpperCase()}`

export const isCompleteProfile = (user: User): boolean => Boolean(user.name && user.email)

export const setLastLogin = (user: User, date: Date): User => ({
  ...user,
  lastLoginAt: date,
})

export const mergeUser = (base: User, updates: Partial<User>): User => ({
  ...base,
  ...updates,
})
```

```ts
export type User = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "admin" | "member"
  lastLoginAt?: Date
}

export const greet = (user: User): string => `Hello, ${user.name}!`

export const statusLabel = (user: User): string => (user.isActive ? "Active" : "Inactive")

export const formatEmail = (user: User): string => user.email.toLowerCase()

export const isAdmin = (user: User): boolean => user.role === "admin"

export const canAccessBilling = (user: User): boolean => user.isActive && user.role === "admin"

export const isStale = (user: User, now = new Date()): boolean =>
  !user.lastLoginAt || now.getTime() - user.lastLoginAt.getTime() > 1000 * 60 * 60 * 24

export const summarizeUser = (user: User): string =>
  `${user.name} (${user.email}) — ${user.isActive ? "Active" : "Inactive"}`

export const formatLastLogin = (user: User): string =>
  user.lastLoginAt ? user.lastLoginAt.toISOString() : "Never"

export const isEligibleForCampaign = (user: User): boolean =>
  user.isActive && user.email.endsWith("@example.com")

export const buildUserLabel = (user: User): string => `${user.name} · ${user.role.toUpperCase()}`

export const isCompleteProfile = (user: User): boolean => Boolean(user.name && user.email)

export const setLastLogin = (user: User, date: Date): User => ({
  ...user,
  lastLoginAt: date,
})

export const mergeUser = (base: User, updates: Partial<User>): User => ({
  ...base,
  ...updates,
})

export const isEmailVerified = (user: User): boolean => user.email.endsWith("@example.com")
```
