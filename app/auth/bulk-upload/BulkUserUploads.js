'use client'

import { useState } from 'react'
import Papa from 'papaparse'

export default function BulkUserUpload() {
  const [csvData, setCsvData] = useState([])
  const [headers, setHeaders] = useState([])

  // Define the exact template of expected columns:
  const headerTemplate = [
    'firstName',
    'lastName',
    'middleName',
    'username',
    'email',
    'password',
  ]

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const headerKeys = meta.fields || []

        // Find any missing or extra columns
        const missing = headerTemplate.filter((col) => !headerKeys.includes(col))
        const extra = headerKeys.filter((col) => !headerTemplate.includes(col))

        if (missing.length || extra.length) {
          alert(
            `CSV headers must be exactly: ${headerTemplate.join(', ')}\n` +
              (missing.length ? `Missing: ${missing.join(', ')}\n` : '') +
              (extra.length ? `Extra: ${extra.join(', ')}` : '')
          )
          setCsvData([])
          setHeaders([])
          return
        }

        setCsvData(data)
        setHeaders(headerKeys)
      },
      error: (err) => {
        console.error('Error parsing CSV:', err)
        alert('Error parsing the CSV file')
      },
    })
  }

  const handleInputChange = (rowIndex, field, value) => {
    setCsvData((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const response = await fetch('/api/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: csvData }),
    })

    if (response.ok) {
      alert(
        'Users uploaded successfully!\nThey can now log in with their username and password.'
      )
      setCsvData([])
      setHeaders([])
    } else {
      alert('Error uploading users')
    }
  }

  return (
    <div>
      <h1>Bulk User Upload</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
        />
        <button type="submit" disabled={!csvData.length}>
          Upload
        </button>
      </form>

      {csvData.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((field) => (
                    <td key={field}>
                      <input
                        type="text"
                        value={row[field] || ''}
                        onChange={(e) =>
                          handleInputChange(rowIndex, field, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
