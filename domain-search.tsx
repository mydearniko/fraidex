"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Filter,
  ChevronDown,
  Globe,
  Users,
  Calendar,
  X,
  Hash,
  Clock,
  Layers,
  Eye,
  EyeOff,
  Server,
  Shield,
  Ruler,
  Tag,
  Sun,
  Moon,
  Loader2, // For loading indicator
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Updated to fetch from the GitHub 'results' branch via jsDelivr
const DATA_URL =
  "https://cdn.jsdelivr.net/gh/mydearniko/fraidex@results/fraidex.json"

// Interface for the raw data structure from fraidex.min.json.br
interface FraidexDomainEntry {
  domain_name: string
  domain_id: number
  hosts_in_use: number
  website: string | null
  status: string // "public" or "private" as strings from source
  owner_name: string
  owner_id: number
  age_raw_text: string
  date_added: string | null
  age_days: number | null
  source_page_number: number
}

// Updated Domain interface for frontend use
interface Domain {
  id: string // domain_id as string
  name: string // domain_name
  status: "public" | "private"
  hosts: number // hosts_in_use
  ageInDays: number // age_days (handle null)
  tld: string // Derived from domain_name
  length: number // Derived from domain_name.length
  domainLevel: number // Derived from tld
  website?: string | null // Optional: from FraidexDomainEntry
  ownerName?: string // Optional: from FraidexDomainEntry
  ownerId?: number // Optional: from FraidexDomainEntry
  dateAdded?: string | null // Optional: from FraidexDomainEntry
}

interface NumericFilter {
  min: number | null
  max: number | null
  enabled: boolean
}

interface FilterState {
  search: string
  status: string[]
  tlds: string[]
  domainLevels: number[]
  hosts: NumericFilter
  age: NumericFilter
  length: NumericFilter
  sortBy: string
  sortOrder: "asc" | "desc"
}

const HOST_PRESETS = [
  { label: "Small (1-100)", min: 1, max: 100 },
  { label: "Medium (101-1K)", min: 101, max: 1000 },
  { label: "Large (1K-10K)", min: 1001, max: 10000 },
  { label: "Enterprise (10K+)", min: 10001, max: null },
]

const AGE_PRESETS = [
  { label: "New (< 1 year)", min: 1, max: 365 },
  { label: "Established (1-5 years)", min: 366, max: 1825 },
  { label: "Mature (5-10 years)", min: 1826, max: 3650 },
  { label: "Legacy (10+ years)", min: 3651, max: null },
]

// Function to determine domain level from the extracted TLD part
const getDomainLevel = (tld: string): number => {
  if (!tld) return 0
  return tld.split(".").length
}

// Multi-select component for TLDs (no changes needed internally)
function TldMultiSelect({
  options,
  selected,
  onSelectionChange,
}: {
  options: string[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleSelection = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((item) => item !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {selected.length === 0
                ? "Select TLDs..."
                : `${selected.length} TLD${
                    selected.length > 1 ? "s" : ""
                  } selected`}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search TLDs..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No TLD found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    onSelect={() => toggleSelection(option)}
                  >
                    <Checkbox
                      checked={selected.includes(option)}
                      className="mr-2"
                    />
                    <Tag className="w-3 h-3 mr-1" />.{option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((tld) => (
            <Badge key={tld} variant="secondary" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />.{tld}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => toggleSelection(tld)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Numeric range input component (no changes needed internally)
function NumericRangeFilter({
  label,
  filter,
  onChange,
  presets,
  formatValue,
  icon: Icon,
}: {
  label: string
  filter: NumericFilter
  onChange: (filter: NumericFilter) => void
  presets?: Array<{ label: string; min: number | null; max: number | null }>
  formatValue?: (value: number) => string
  icon?: React.ComponentType<{ className?: string }>
}) {
  const [minInput, setMinInput] = useState(filter.min?.toString() || "")
  const [maxInput, setMaxInput] = useState(filter.max?.toString() || "")

  useEffect(() => {
    setMinInput(filter.min?.toString() || "")
    setMaxInput(filter.max?.toString() || "")
  }, [filter.min, filter.max])

  const handleMinChange = (value: string) => {
    setMinInput(value)
    const num = value === "" ? null : Number.parseInt(value)
    if (num === null || !isNaN(num)) {
      onChange({ ...filter, min: num })
    }
  }

  const handleMaxChange = (value: string) => {
    setMaxInput(value)
    const num = value === "" ? null : Number.parseInt(value)
    if (num === null || !isNaN(num)) {
      onChange({ ...filter, max: num })
    }
  }

  const applyPreset = (preset: { min: number | null; max: number | null }) => {
    onChange({ ...filter, min: preset.min, max: preset.max, enabled: true })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </Label>
        <Checkbox
          checked={filter.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...filter, enabled: Boolean(checked) })
          }
        />
      </div>

      {filter.enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor={`${label}-min`}
                className="text-xs text-muted-foreground"
              >
                Min
              </Label>
              <Input
                id={`${label}-min`}
                type="number"
                placeholder="Min"
                value={minInput}
                onChange={(e) => handleMinChange(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label
                htmlFor={`${label}-max`}
                className="text-xs text-muted-foreground"
              >
                Max
              </Label>
              <Input
                id={`${label}-max`}
                type="number"
                placeholder="Max"
                value={maxInput}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          {presets && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Quick Select:
              </Label>
              <div className="grid grid-cols-1 gap-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs justify-start"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(filter.min !== null || filter.max !== null) && (
            <div className="text-xs text-muted-foreground">
              Range:{" "}
              {filter.min === null
                ? 0
                : formatValue
                  ? formatValue(filter.min)
                  : filter.min}{" "}
              -{" "}
              {filter.max === null
                ? "∞"
                : formatValue
                  ? formatValue(filter.max)
                  : filter.max}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean
  onToggle: () => void
}) {
  return (
    <Button
      variant={isDark ? "outline" : "default"}
      size="sm"
      onClick={onToggle}
      className={`flex items-center gap-2 transition-all duration-300 ease-in-out hover:scale-105 ${
        isDark
          ? "border-2 border-border bg-background text-foreground hover:bg-accent"
          : "bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary"
      }`}
    >
      <div className="relative">
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-300 ease-in-out rotate-0" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 ease-in-out rotate-0" />
        )}
      </div>
      <span className="font-medium">{isDark ? "Light" : "Dark"}</span>
    </Button>
  )
}

export default function Component() {
  const [allDomains, setAllDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: [],
    tlds: [],
    domainLevels: [],
    hosts: { min: null, max: null, enabled: false },
    age: { min: null, max: null, enabled: false },
    length: { min: null, max: null, enabled: false },
    sortBy: "hosts",
    sortOrder: "desc",
  })

  const itemsPerPage = 15

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const response = await fetch(DATA_URL)
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} - ${response.statusText}`,
          )
        }
        const rawData: FraidexDomainEntry[] = await response.json()

        const processedDomains: Domain[] = rawData.map((entry) => {
          const domainName = entry.domain_name
          let tld = ""
          const dotIndex = domainName.indexOf(".")

          if (dotIndex !== -1 && dotIndex < domainName.length - 1) {
            tld = domainName.substring(dotIndex + 1)
          } else {
            tld = domainName // or handle as error/default if domain_name can be invalid
          }

          return {
            id: entry.domain_id.toString(),
            name: domainName,
            status:
              entry.status.toLowerCase() === "public" ? "public" : "private",
            hosts: entry.hosts_in_use,
            ageInDays: entry.age_days ?? 0,
            tld: tld,
            length: domainName.length,
            domainLevel: getDomainLevel(tld),
            website: entry.website,
            ownerName: entry.owner_name,
            ownerId: entry.owner_id,
            dateAdded: entry.date_added,
          }
        })
        setAllDomains(processedDomains)
      } catch (e) {
        console.error("Failed to fetch or process domain data:", e)
        setFetchError(
          e instanceof Error
            ? e.message
            : "An unknown error occurred while fetching data.",
        )
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    document.documentElement.style.transition =
      "background-color 0.3s ease, color 0.3s ease"
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    const timer = setTimeout(() => {
      document.documentElement.style.transition = ""
    }, 300)
    return () => clearTimeout(timer)
  }, [isDarkMode])

  const uniqueTlds = useMemo(
    () => [...new Set(allDomains.map((d) => d.tld))].sort(),
    [allDomains],
  )
  const uniqueDomainLevels = useMemo(
    () =>
      [...new Set(allDomains.map((d) => d.domainLevel))].sort((a, b) => a - b),
    [allDomains],
  )

  const filteredDomains = useMemo(() => {
    const filtered = allDomains.filter((domain) => {
      if (
        filters.search &&
        !domain.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false
      }
      if (
        filters.status.length > 0 &&
        !filters.status.includes(domain.status)
      ) {
        return false
      }
      if (filters.tlds.length > 0 && !filters.tlds.includes(domain.tld)) {
        return false
      }
      if (
        filters.domainLevels.length > 0 &&
        !filters.domainLevels.includes(domain.domainLevel)
      ) {
        return false
      }
      if (filters.hosts.enabled) {
        if (filters.hosts.min !== null && domain.hosts < filters.hosts.min)
          return false
        if (filters.hosts.max !== null && domain.hosts > filters.hosts.max)
          return false
      }
      if (filters.age.enabled) {
        if (filters.age.min !== null && domain.ageInDays < filters.age.min)
          return false
        if (filters.age.max !== null && domain.ageInDays > filters.age.max)
          return false
      }
      if (filters.length.enabled) {
        if (filters.length.min !== null && domain.length < filters.length.min)
          return false
        if (filters.length.max !== null && domain.length > filters.length.max)
          return false
      }
      return true
    })

    filtered.sort((a, b) => {
      let aVal: any = a[filters.sortBy as keyof Domain]
      let bVal: any = b[filters.sortBy as keyof Domain]

      if (typeof aVal === "string") aVal = aVal.toLowerCase()
      if (typeof bVal === "string") bVal = bVal.toLowerCase()

      // Ensure numbers are compared as numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return filters.sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }

      if (filters.sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    return filtered
  }, [allDomains, filters])

  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage)
  const paginatedDomains = filteredDomains.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const toggleArrayFilter = (
    key: "status" | "domainLevels",
    value: string | number,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value as never)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value as never],
    }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      status: [],
      tlds: [],
      domainLevels: [],
      hosts: { min: null, max: null, enabled: false },
      age: { min: null, max: null, enabled: false },
      length: { min: null, max: null, enabled: false },
      sortBy: "hosts",
      sortOrder: "desc",
    })
    setCurrentPage(1)
  }

  const activeFiltersCount = [
    filters.search ? 1 : 0,
    filters.status.length,
    filters.tlds.length,
    filters.domainLevels.length,
    filters.hosts.enabled ? 1 : 0,
    filters.age.enabled ? 1 : 0,
    filters.length.enabled ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatAge = (days: number) => {
    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    if (years > 0) return `${years}y ${remainingDays}d`
    return `${days}d`
  }

  const getDomainLevelLabel = (level: number) => {
    if (level <= 0) return "N/A"
    switch (level) {
      case 1:
        return "1st Level (.com, .org)"
      case 2:
        return "2nd Level (.co.uk, .com.au)"
      case 3:
        return "3rd Level (.com.co.uk)"
      default:
        return `${level}th Level`
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 ease-in-out flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-foreground">
            Loading domain data, please wait...
          </p>
          <p className="text-sm text-muted-foreground">
            (This may take a moment for the first load)
          </p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 ease-in-out flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <X className="h-6 w-6" /> Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">
              Failed to load domain data. Please try again later.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Details: {fetchError}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 ease-in-out">
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="transition-colors duration-300 ease-in-out">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </div>
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" />
                      {activeFiltersCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Precise filtering controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div>
                  <Label htmlFor="search" className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Domain
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Enter domain name..."
                      value={filters.search}
                      onChange={(e) => updateFilter("search", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Separator />

                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Status
                  </Label>
                  <div className="mt-2 space-y-2">
                    {["public", "private"].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={status}
                          checked={filters.status.includes(status)}
                          onCheckedChange={() =>
                            toggleArrayFilter("status", status)
                          }
                        />
                        <Label
                          htmlFor={status}
                          className="capitalize text-sm flex items-center gap-2"
                        >
                          {status === "public" ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* TLD Multi-Select */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Top Level Domains
                  </Label>
                  <div className="mt-2">
                    <TldMultiSelect
                      options={uniqueTlds}
                      selected={filters.tlds}
                      onSelectionChange={(selected) =>
                        updateFilter("tlds", selected)
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Domain Level Filter */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Domain Level
                  </Label>
                  <div className="mt-2 space-y-2">
                    {uniqueDomainLevels.map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={`level-${level}`}
                          checked={filters.domainLevels.includes(level)}
                          onCheckedChange={() =>
                            toggleArrayFilter("domainLevels", level)
                          }
                        />
                        <Label
                          htmlFor={`level-${level}`}
                          className="text-sm flex items-center gap-2"
                        >
                          <Hash className="w-3 h-3" />
                          {getDomainLevelLabel(level)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <NumericRangeFilter
                  label="Host Count"
                  filter={filters.hosts}
                  onChange={(filter) => updateFilter("hosts", filter)}
                  presets={HOST_PRESETS}
                  formatValue={formatNumber}
                  icon={Server}
                />

                <Separator />

                <NumericRangeFilter
                  label="Domain Age (days)"
                  filter={filters.age}
                  onChange={(filter) => updateFilter("age", filter)}
                  presets={AGE_PRESETS}
                  formatValue={formatAge}
                  icon={Clock}
                />

                <Separator />

                <NumericRangeFilter
                  label="Domain Length"
                  filter={filters.length}
                  onChange={(filter) => updateFilter("length", filter)}
                  icon={Ruler}
                />

                <Separator />

                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full mt-4 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <Card className="transition-colors duration-300 ease-in-out">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Domain Results
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Found {filteredDomains.length.toLocaleString()} domains
                      matching your criteria
                    </CardDescription>
                  </div>
                  <ThemeToggle
                    isDark={isDarkMode}
                    onToggle={() => setIsDarkMode(!isDarkMode)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    Sort by:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-48 justify-between text-left font-normal"
                        >
                          <div className="flex items-center gap-2">
                            {filters.sortBy === "hosts" && (
                              <Server className="w-4 h-4" />
                            )}
                            {filters.sortBy === "ageInDays" && (
                              <Clock className="w-4 h-4" />
                            )}
                            {filters.sortBy === "name" && (
                              <Globe className="w-4 h-4" />
                            )}
                            {filters.sortBy === "length" && (
                              <Ruler className="w-4 h-4" />
                            )}
                            {filters.sortBy === "status" && (
                              <Shield className="w-4 h-4" />
                            )}
                            <span>
                              {filters.sortBy === "hosts" && "Host Count"}
                              {filters.sortBy === "ageInDays" && "Domain Age"}
                              {filters.sortBy === "name" && "Domain Name"}
                              {filters.sortBy === "length" && "Domain Length"}
                              {filters.sortBy === "status" && "Status"}
                            </span>
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0">
                        <Command>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => updateFilter("sortBy", "hosts")}
                                className="flex items-center gap-2"
                              >
                                <Server className="w-4 h-4" />
                                Host Count
                                {filters.sortBy === "hosts" && (
                                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                              </CommandItem>
                              <CommandItem
                                onSelect={() =>
                                  updateFilter("sortBy", "ageInDays")
                                }
                                className="flex items-center gap-2"
                              >
                                <Clock className="w-4 h-4" />
                                Domain Age
                                {filters.sortBy === "ageInDays" && (
                                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                              </CommandItem>
                              <CommandItem
                                onSelect={() => updateFilter("sortBy", "name")}
                                className="flex items-center gap-2"
                              >
                                <Globe className="w-4 h-4" />
                                Domain Name
                                {filters.sortBy === "name" && (
                                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                              </CommandItem>
                              <CommandItem
                                onSelect={() =>
                                  updateFilter("sortBy", "length")
                                }
                                className="flex items-center gap-2"
                              >
                                <Ruler className="w-4 h-4" />
                                Domain Length
                                {filters.sortBy === "length" && (
                                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                              </CommandItem>
                              <CommandItem
                                onSelect={() =>
                                  updateFilter("sortBy", "status")
                                }
                                className="flex items-center gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Status
                                {filters.sortBy === "status" && (
                                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFilter(
                          "sortOrder",
                          filters.sortOrder === "asc" ? "desc" : "asc",
                        )
                      }
                      className="flex items-center gap-1"
                    >
                      {filters.sortOrder === "asc" ? (
                        <>
                          <ChevronDown className="w-4 h-4 rotate-180" />
                          Ascending
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Descending
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Domain
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Status
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Server className="w-4 h-4" />
                            Hosts
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Clock className="w-4 h-4" />
                            Age
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDomains.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {domain.website ? (
                                  <a
                                    href={domain.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {domain.name}
                                  </a>
                                ) : (
                                  domain.name
                                )}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                              >
                                <Ruler className="w-3 h-3" />
                                {domain.length}
                              </Badge>
                              {domain.domainLevel > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Layers className="w-3 h-3" />L
                                  {domain.domainLevel}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                domain.status === "public"
                                  ? "default"
                                  : "secondary"
                              }
                              className="flex items-center gap-1 w-fit"
                            >
                              {domain.status === "public" ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                              {domain.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {formatNumber(domain.hosts)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatAge(domain.ageInDays)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedDomains.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-10 text-muted-foreground"
                          >
                            No domains found matching your criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage > 1)
                                setCurrentPage(currentPage - 1)
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>

                        {/* Simplified Pagination Logic for brevity - could be more advanced */}
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum = i + 1
                            if (totalPages > 5) {
                              if (currentPage <= 3) {
                                // Show 1, 2, 3, 4, 5
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 2) {
                                // Show last 5 pages
                                pageNum = totalPages - 4 + i
                              } else {
                                // Show current page in middle
                                pageNum = currentPage - 2 + i
                              }
                            }
                            if (pageNum > totalPages || pageNum < 1) return null

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setCurrentPage(pageNum)
                                  }}
                                  isActive={currentPage === pageNum}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          },
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage < totalPages)
                                setCurrentPage(currentPage + 1)
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
