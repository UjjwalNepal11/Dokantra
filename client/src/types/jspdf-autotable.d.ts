declare module 'jspdf-autotable' {
  import type { jsPDF } from 'jspdf'

  export interface AutoTableOptions {
    startY?: number
    margin?: { top?: number; right?: number; bottom?: number; left?: number }
    theme?: 'striped' | 'grid' | 'plain'
    head?: string[][]
    body?: string[][]
    foot?: string[][]
    headStyles?: Record<string, unknown>
    bodyStyles?: Record<string, unknown>
    footStyles?: Record<string, unknown>
    styles?: Record<string, unknown>
    columnStyles?: Record<number, Record<string, unknown>>
    didDrawPage?: (data: { pageNumber: number; pageCount: number }) => void
    showHead?: 'everyPage' | 'firstPage' | 'never'
    showFoot?: 'everyPage' | 'firstPage' | 'never'
    tableWidth?: 'auto' | 'wrap' | number
    tableLineColor?: number | number[]
    tableLineWidth?: number
    [key: string]: unknown
  }

  export interface LastAutoTable {
    finalY: number
  }

  export function autoTable(doc: jsPDF, options: AutoTableOptions): void

  export default autoTable
}
