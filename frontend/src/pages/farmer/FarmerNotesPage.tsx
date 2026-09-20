import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  createFarmNote,
  deleteFarmNote,
  listFarmNotes,
  updateFarmNote,
  type FarmNote,
} from '../../api/farmNotes'
import { PageHeader } from '../../layouts'
import { Loader2, Plus, X, Pencil, Trash2 } from 'lucide-react'

const CROP_EMOJI: Record<string, string> = {
  tomato: '🍅',
  potato: '🥔',
  onion: '🧅',
  rice: '🌾',
  paddy: '🌾',
  corn: '🌽',
  wheat: '🌾',
  chili: '🌶️',
}

interface FormState {
  crop: string
  note: string
  note_date: string
  note_time: string
  harvest_info: string
}

const EMPTY_FORM: FormState = {
  crop: '',
  note: '',
  note_date: new Date().toISOString().slice(0, 10),
  note_time: '',
  harvest_info: '',
}

export default function FarmerNotesPage() {
  const [notes, setNotes] = useState<FarmNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FarmNote | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    listFarmNotes()
      .then(({ data }) => {
        setNotes(data)
        setError(null)
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (note: FarmNote) => {
    setEditing(note)
    setForm({
      crop: note.crop,
      note: note.note,
      note_date: note.note_date,
      note_time: note.note_time ?? '',
      harvest_info: note.harvest_info ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const set = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.crop || !form.note) {
      setFormError('Crop and note are required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        crop: form.crop,
        note: form.note,
        note_date: form.note_date,
        note_time: form.note_time || undefined,
        harvest_info: form.harvest_info || undefined,
      }
      if (editing) {
        await updateFarmNote(editing.id, payload)
      } else {
        await createFarmNote(payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (note: FarmNote) => {
    if (!window.confirm(`Delete note for ${note.crop}?`)) return
    try {
      await deleteFarmNote(note.id)
      setNotes((current) => current.filter((n) => n.id !== note.id))
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const sorted = [...notes].sort(
    (a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime(),
  )

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 space-y-4">
        <PageHeader title="Farm Notes" description="Diary of your crops" />
        {loading && (
          <div className="flex items-center gap-3 text-emerald-700 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading notes…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {sorted.length === 0 && !loading && (
          <div className="rounded-3xl bg-white border border-emerald-100 p-8 text-center space-y-2">
            <div className="text-4xl">📓</div>
            <h3 className="text-base font-black text-slate-900">No farm notes yet</h3>
            <p className="text-xs text-slate-500">
              Keep a diary of your crops — sowing, spray, harvest and more.
            </p>
          </div>
        )}

        {sorted.map((note) => (
          <article
            key={note.id}
            className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm flex gap-4"
          >
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl">
              {CROP_EMOJI[note.crop.toLowerCase()] ?? '🌱'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900">{note.crop}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>
                    {new Date(note.note_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {note.note_time && <span>· {note.note_time.slice(0, 5)}</span>}
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{note.note}</p>
              {note.harvest_info && (
                <p className="text-[11px] text-emerald-700 mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                  🧺 Harvest: {note.harvest_info}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => openEdit(note)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B5E3C] hover:underline"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(note)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        onClick={openCreate}
        className="md:hidden fixed right-4 bottom-24 z-40 inline-flex items-center gap-1.5 rounded-full bg-[#1B5E3C] text-white px-5 py-3 text-xs font-black shadow-lg shadow-emerald-900/30"
      >
        <Plus className="w-4 h-4" /> Add New Note
      </button>
      <button
        onClick={openCreate}
        className="hidden md:inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black shadow-lg shadow-emerald-900/20 bg-[#1B5E3C] text-white"
      >
        <Plus className="w-4 h-4" /> Add New Note
      </button>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit note' : 'Add new note'}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {editing ? 'Edit Note' : 'Add New Note'}
                </h3>
                <p className="text-xs text-slate-500">{editing ? editing.crop : 'Crop diary entry'}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Crop</label>
              <input
                value={form.crop}
                onChange={(event) => set('crop')(event.target.value)}
                placeholder="e.g. Tomato"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2e7d4f] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
              <textarea
                value={form.note}
                onChange={(event) => set('note')(event.target.value)}
                rows={4}
                placeholder="Watering, spraying, sowing observations…"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2e7d4f] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.note_date}
                  onChange={(event) => set('note_date')(event.target.value)}
                  required
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2e7d4f] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={form.note_time}
                  onChange={(event) => set('note_time')(event.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2e7d4f] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Harvest Info <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={form.harvest_info}
                onChange={(event) => set('harvest_info')(event.target.value)}
                placeholder="e.g. Expected 500 kg next week"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2e7d4f] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#1B5E3C] hover:bg-[#2e7d4f] text-white font-black text-sm disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Note'}
            </button>
          </form>
        </div>
      )}

      
    </div>
  )
}
