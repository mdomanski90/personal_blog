'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function AdminPage() {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: '',
        year: '',
        rating: '',
        description: ''
    })
    const [status, setStatus] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    year: formData.year ? parseInt(formData.year) : null,
                    rating: formData.rating ? parseInt(formData.rating) : null,
                })
            })

            if (res.ok) {
                setStatus('✅ dodano!')
                setFormData({ title: '', author: '', category: '', year: '', rating: '', description: '' })
                setTimeout(() => setStatus(''), 3000)
            } else {
                setStatus('❌ błąd')
            }
        } catch (err) {
            setStatus('❌ błąd: ' + err)
        }
    }

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <h1 className="text-3xl font-bold lowercase mb-8">admin - dodaj pozycję</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold lowercase mb-2">tytuł *</label>
                    <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="font-mono lowercase"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold lowercase mb-2">autor</label>
                    <Input
                        value={formData.author}
                        onChange={(e) => setFormData({...formData, author: e.target.value})}
                        className="font-mono lowercase"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold lowercase mb-2">kategoria</label>
                    <Input
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="font-mono lowercase"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold lowercase mb-2">rok</label>
                        <Input
                            type="number"
                            value={formData.year}
                            onChange={(e) => setFormData({...formData, year: e.target.value})}
                            className="font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold lowercase mb-2">ocena (1-10)</label>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.rating}
                            onChange={(e) => setFormData({...formData, rating: e.target.value})}
                            className="font-mono"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold lowercase mb-2">opis</label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="font-mono lowercase min-h-32"
                    />
                </div>

                <Button type="submit" className="w-full font-mono lowercase font-bold">
                    dodaj pozycję
                </Button>

                {status && (
                    <div className="text-center text-sm lowercase">{status}</div>
                )}
            </form>
        </div>
    )
}
