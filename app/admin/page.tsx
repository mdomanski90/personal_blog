'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function AdminPage() {
    const [formData, setFormData] = useState({
        data_dodania: '',
        typ: '',
        osoba: '',
        miejscowosc: '',
        data_wydarzenia: '',
        zawartosc: ''
    })
    const [status, setStatus] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setStatus('✅ dodano!')
                setFormData({ data_dodania: '', typ: '', osoba: '', miejscowosc: '', data_wydarzenia: '', zawartosc: '' })
                setTimeout(() => setStatus(''), 3000)
            } else {
                setStatus('❌ błąd')
            }
        } catch (err) {
            setStatus('❌ błąd: ' + err)
        }
    }

    const fields = [
        { key: 'data_dodania', label: 'data dodania', required: true, type: 'date', placeholder: '' },
        { key: 'typ', label: 'typ', required: false, type: 'text', placeholder: 'np. akt urodzenia, ślub, zgon...' },
        { key: 'osoba', label: 'osoba', required: false, type: 'text', placeholder: 'imię i nazwisko' },
        { key: 'miejscowosc', label: 'miejscowość', required: false, type: 'text', placeholder: 'nazwa miejscowości' },
        { key: 'data_wydarzenia', label: 'data wydarzenia', required: false, type: 'date', placeholder: '' },
        { key: 'zawartosc', label: 'zawartość', required: false, type: 'textarea', placeholder: 'szczegółowy opis, notatki, źródła...' },
    ]

    return (
        <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-4">
                <div className="text-sm lowercase text-gray-600 dark:text-gray-400">
                    admin - <span className="font-bold">dodaj pozycję do bazy danych</span>
                </div>

                <article className="post-content prose prose-slate dark:prose-invert max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                    <div className="overflow-x-auto">
                        <form onSubmit={handleSubmit}>
                            <table style={{ width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '180px' }} />
                                    <col style={{ width: 'auto' }} />
                                </colgroup>
                                <thead>
                                <tr>
                                    <th>
                                        <div className="not-prose">
                                            <span className="lowercase font-bold">pole</span>
                                        </div>
                                    </th>
                                    <th>
                                        <div className="not-prose">
                                            <span className="lowercase font-bold">wartość</span>
                                        </div>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {fields.map((field, index) => (
                                    <tr key={field.key} style={field.type === 'textarea' ? { height: '200px' } : {}}>
                                        <td style={field.type === 'textarea' ? { verticalAlign: 'top', paddingTop: '1rem' } : {}}>
                                            <span className="lowercase font-bold">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-600 dark:text-red-400 ml-1">*</span>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            {field.type === 'textarea' ? (
                                                <Textarea
                                                    value={formData[field.key as keyof typeof formData]}
                                                    onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                                                    className="font-mono lowercase text-sm leading-relaxed w-full rounded-sm resize-none"
                                                    style={{ minHeight: '160px' }}
                                                    placeholder={field.placeholder}
                                                />
                                            ) : (
                                                <Input
                                                    type={field.type}
                                                    value={formData[field.key as keyof typeof formData]}
                                                    onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                                                    className="h-7 text-xs lowercase font-mono rounded-sm w-full"
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                            <div className="not-prose flex flex-col gap-4 mt-6">
                                <Button
                                    type="submit"
                                    variant="default"
                                    size="lg"
                                    className="w-full font-mono lowercase font-bold text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
                                >
                                    + dodaj pozycję
                                </Button>

                                {status && (
                                    <div className="text-center text-sm lowercase font-mono">
                                        {status}
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </article>
            </div>
        </div>
    )
}
