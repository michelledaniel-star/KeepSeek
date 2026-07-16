import React, { useState } from 'react';
import { updatePerson } from '../services/airtable';
import { composeLabels } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import PersonPhotoModal from './PersonPhotoModal';

const getGeneration = (relationship) => {
  const map = {
    'Husband': 0, 'Wife': 0, 'Partner': 0,
    'Mother': 1, 'Father': 1, 'Parent': 1,
    'Grandmother': 2, 'Grandfather': 2, 'Grandparent': 2,
    'Great-Grandmother': 3, 'Great-Grandfather': 3, 'Great-Grandparent': 3,
    'Sister': 0, 'Brother': 0, 'Sibling': 0,
    'Daughter': -1, 'Son': -1, 'Child': -1,
    'Aunt': 1, 'Uncle': 1, "Parent's Sibling": 1,
    'Cousin': 0, 'Friend': 0, 'Other': 0,
  };
  return map[relationship] ?? 0;
};

const EditPerson = ({ person, onClose, onSuccess, onCompleteLater }) => {
  const { keeperId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const nameParts = (person.name || '').split(' ');
  const inferredFirst = nameParts[0] || '';
  const inferredLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const [formData, setFormData] = useState({
    firstName: person.firstName || inferredFirst,
    lastName: person.lastName || inferredLast,
    middleName: person.middleName || '',
    maidenName: person.maidenName || '',
    relationship: person.relationship || '',
    side: person.side || '',
    years: person.years || '',
    location: person.location || '',
    birthdate: person.birthdate || '',
    notes: person.notes || '',
    generation: person.generation || 0,
    qualifiers: person.qualifiers || [],
    greatCount: person.greatCount || 0,
  });

  // Which relationships allow the Great stepper (Grandparents + Aunt/Uncle only)
  const GREAT_ELIGIBLE = new Set([
    'Grandmother', 'Grandfather', 'Grandparent',
    'Aunt', 'Uncle',
  ]);
  const showGreatStepper = GREAT_ELIGIBLE.has(formData.relationship);

  // Toggle a qualifier on/off in the formData.qualifiers array
  const toggleQualifier = (qualifier) => {
    const current = formData.qualifiers || [];
    const next = current.includes(qualifier)
      ? current.filter(q => q !== qualifier)
      : [...current, qualifier];
    updateFormData({ qualifiers: next });
  };

  // Build live preview using the composer. Pass an empty people array —
  // the preview doesn't need to look up a partner, just show the qualifier effect.
  const previewPerson = {
    ...person,
    relationship: formData.relationship,
    qualifiers: formData.qualifiers,
    greatCount: formData.greatCount,
    relatedVia: null, // Preview ignores partner anchoring — that's B3.
  };
  const { primary: previewLabel } = composeLabels(previewPerson, [], null);

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleSave = async (complete) => {
    setLoading(true);
    try {
      await updatePerson(person.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        maidenName: formData.maidenName,
        relationship: formData.relationship,
        years: formData.years,
        location: formData.location,
        birthdate: formData.birthdate,
        notes: formData.notes,
        side: formData.side || '',
        generation: getGeneration(formData.relationship),
        entryComplete: complete,
        qualifiers: formData.qualifiers,
        greatCount: formData.greatCount,
      }, keeperId);
    } catch (error) {
      console.error('Error updating person:', error);
      alert('Error updating profile. Please try again.');
      throw error;
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] overflow-y-auto">
      <div className="bg-white w-full max-w-lg mx-4 my-6 p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
            Edit Profile
          </h2>
          <button onClick={() => isDirty ? setShowUnsavedWarning(true) : onClose()} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5">

          {/* Photos */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              {person.photo ? (
                <img
                  src={person.photo}
                  alt={person.name}
                  className="w-16 h-16 rounded-full object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium"
                  style={{ backgroundColor: '#669999' }}
                >
                  {[formData.firstName, formData.lastName].filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="px-4 py-2 border border-gray-300 text-sm hover:border-gray-400 transition-colors"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {person.photo ? 'Manage Photos' : 'Add Photo'}
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => updateFormData({ firstName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => updateFormData({ lastName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={e => updateFormData({ middleName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Maiden Name</label>
              <input
                type="text"
                value={formData.maidenName}
                onChange={e => updateFormData({ maidenName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
          </div>

          {/* Relationship */}
          {person.relationship !== 'Self' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Relationship
              </label>
              <select
                value={formData.relationship}
                onChange={e => updateFormData({
                  relationship: e.target.value,
                  generation: getGeneration(e.target.value),
                })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              >
                <option value="">Select...</option>
                <optgroup label="Spouse / Partner">
                  <option>Husband</option>
                  <option>Wife</option>
                  <option>Partner</option>
                </optgroup>
                <optgroup label="Parents">
                  <option>Mother</option>
                  <option>Father</option>
                  <option>Parent</option>
                </optgroup>
                <optgroup label="Grandparents">
                  <option>Grandmother</option>
                  <option>Grandfather</option>
                  <option>Grandparent</option>
                </optgroup>
                <optgroup label="Great-Grandparents">
                  <option>Great-Grandmother</option>
                  <option>Great-Grandfather</option>
                  <option>Great-Grandparent</option>
                </optgroup>
                <optgroup label="Siblings">
                  <option>Sister</option>
                  <option>Brother</option>
                  <option>Sibling</option>
                </optgroup>
                <optgroup label="Children">
                  <option>Daughter</option>
                  <option>Son</option>
                  <option>Child</option>
                </optgroup>
                <optgroup label="Extended Family">
                  <option>Aunt</option>
                  <option>Uncle</option>
                  <option>Parent's Sibling</option>
                  <option>Cousin</option>
                </optgroup>
                <optgroup label="Non-Family">
                  <option>Friend</option>
                  <option>Other</option>
                </optgroup>
              </select>
            </div>
          )}

          {/* Side */}
          {person.relationship !== 'Self' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Side (optional)
              </label>
              <select
                value={formData.side}
                onChange={e => updateFormData({ side: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              >
                <option value="">—</option>
                <option>My Family</option>
                <option>Partner Family</option>
                <option>No Relation</option>
              </select>
            </div>
          )}


          {/* Optional Relationship Qualifiers */}
          {person.relationship !== 'Self' && formData.relationship && (
            <div className="bg-gray-50 p-4 border border-gray-200">
              <h3 className="text-base mb-2" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
                Optional Relationship Qualifiers
              </h3>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Preview: {previewLabel || '—'}
              </p>

              <div className="grid grid-cols-3 gap-x-4 gap-y-3">

                {/* Great stepper — always visible */}
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Great</span>
                  <button
                    type="button"
                    onClick={() => updateFormData({ greatCount: Math.max(0, formData.greatCount - 1) })}
                    disabled={formData.greatCount === 0}
                    className="w-7 h-7 border border-gray-300 text-sm disabled:opacity-30"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>{formData.greatCount}</span>
                  <button
                    type="button"
                    onClick={() => updateFormData({ greatCount: formData.greatCount + 1 })}
                    className="w-7 h-7 border border-gray-300 text-sm"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    +
                  </button>
                </div>

                {/* Step */}
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={formData.qualifiers.includes('Step')}
                    onChange={() => toggleQualifier('Step')}
                    className="w-4 h-4"
                  />
                  Step
                </label>

                {/* Half */}
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={formData.qualifiers.includes('Half')}
                    onChange={() => toggleQualifier('Half')}
                    className="w-4 h-4"
                  />
                  Half
                </label>

                {/* In-Law */}
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={formData.qualifiers.includes('In-Law')}
                    onChange={() => toggleQualifier('In-Law')}
                    className="w-4 h-4"
                  />
                  In-Law
                </label>

                {/* Former */}
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={formData.qualifiers.includes('Former')}
                    onChange={() => toggleQualifier('Former')}
                    className="w-4 h-4"
                  />
                  Former
                </label>

                {/* Late */}
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={formData.qualifiers.includes('Late')}
                    onChange={() => toggleQualifier('Late')}
                    className="w-4 h-4"
                  />
                  Late
                </label>

              </div>
            </div>
          )}

          {/* Years */}
          {person.relationship !== 'Self' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Years
              </label>
              <input
                type="text"
                value={formData.years}
                onChange={e => updateFormData({ years: e.target.value })}
                placeholder="e.g. 1942 — 2008"
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
          )}

          {/* Birthdate */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Birthdate
            </label>
            <input
              type="text"
              value={formData.birthdate}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                let formatted = raw;
                if (raw.length >= 5) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
                else if (raw.length >= 3) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
                updateFormData({ birthdate: formatted });
              }}
              placeholder="mm/dd/yyyy"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>

          {/* Birthplace */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Birthplace
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={e => updateFormData({ location: e.target.value })}
              placeholder="City, State or Country"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e => updateFormData({ notes: e.target.value })}
              rows={4}
              placeholder="Memories, stories, or anything worth remembering about this person..."
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black resize-none text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try { await handleSave(false); onSuccess?.(); } catch {}
                }}
                disabled={loading || !formData.firstName}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm disabled:opacity-50"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? 'Saving...' : 'Save As Is'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try { await handleSave(true); onSuccess?.(); } catch {}
                }}
                disabled={loading || !formData.firstName}
                className="flex-1 px-4 py-2 bg-black text-white text-sm disabled:opacity-50"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                try { await handleSave(false); onCompleteLater?.(); } catch {}
              }}
              disabled={loading || !formData.firstName}
              className="w-full px-4 py-2 border border-gray-300 text-sm disabled:opacity-50"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Complete Later
            </button>
          </div>
        </div>
      </div>

      {showUnsavedWarning && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]"
          onClick={() => setShowUnsavedWarning(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full mx-4 p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading italic tracking-[0.05em]">You have unsaved changes</h3>
            <p className="font-body text-sm text-gray-600">If you leave now your changes will be lost.</p>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowUnsavedWarning(false);
                  try { await handleSave(true); onSuccess?.(); } catch {}
                }}
                className="w-full px-6 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors rounded-lg"
              >
                Save and close
              </button>
              <button
                type="button"
                onClick={() => { setShowUnsavedWarning(false); onClose(); }}
                className="w-full px-6 py-3 border-2 border-gray-300 font-subhead text-sm tracking-[0.01em] hover:border-gray-400 transition-colors rounded-lg"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full text-sm font-body text-gray-400 hover:text-gray-600"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <PersonPhotoModal
          person={person}
          onClose={() => setShowPhotoModal(false)}
          onSuccess={() => {
            setShowPhotoModal(false);
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default EditPerson;