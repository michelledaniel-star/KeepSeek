import React, { useState } from 'react';
import { createPerson } from '../services/airtable';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const PARTNER_RELATIONSHIPS = new Set(['Husband', 'Wife', 'Partner']);

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

// Capitalize each word: "tom SMITH" → "Tom Smith"
const titleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase());

export default function AddPersonQuick({ onClose, onSuccess }) {
  const { keeperId, partnerNames, setPartnerNames } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [side, setSide] = useState('');
  const [relationship, setRelationship] = useState('');
  const [partnerFirstName, setPartnerFirstName] = useState('');
  const [partnerLastName, setPartnerLastName] = useState('');
  const [saving, setSaving] = useState(false);

  // Is this person themselves a partner being introduced?
  const isPartnerBeingAdded = side === 'Partner Family' && PARTNER_RELATIONSHIPS.has(relationship);

  // Does the Partner Name input need to appear? Only when adding a partner-side
  // relative (not the partner themselves) AND the "Partner Family" generic
  // option is picked (not a named family like "Bob's Family").
  const needsPartnerNameInput = side === 'Partner Family' && relationship && !PARTNER_RELATIONSHIPS.has(relationship);

  const handleAdd = async () => {
    // Validation: First name + Side + Relationship are always required.
    if (!firstName.trim() || !side || !relationship) {
      alert('Please fill in First Name, Side, and Relationship.');
      return;
    }

    // If the Partner Name input is showing, both first + last are required.
    if (needsPartnerNameInput && (!partnerFirstName.trim() || !partnerLastName.trim())) {
      alert('Please enter the partner\'s first and last name.');
      return;
    }

    setSaving(true);
    try {
      // Determine the final side string + any partner_names additions.
      let finalSide = side;
      let newPartnerEntry = null;

      if (isPartnerBeingAdded) {
        // This person IS the partner. Use their own name for the side.
        finalSide = `${titleCase(firstName.trim())}'s Family`;
        newPartnerEntry = {
          first: titleCase(firstName.trim()),
          last: titleCase(lastName.trim()),
        };
      } else if (needsPartnerNameInput) {
        // This person is a partner-side relative. Use the entered partner name.
        finalSide = `${titleCase(partnerFirstName.trim())}'s Family`;
        newPartnerEntry = {
          first: titleCase(partnerFirstName.trim()),
          last: titleCase(partnerLastName.trim()),
        };
      }
      // Otherwise finalSide stays as whatever the user picked ("My Family",
      // "Bob's Family", "No Relation", etc.) — no partner_names change.

      // If a new partner name was introduced, add it to partner_names if not
      // already present (match on first name only — case-insensitive).
      if (newPartnerEntry) {
        const alreadyExists = partnerNames.some(
          p => p.first?.toLowerCase() === newPartnerEntry.first.toLowerCase()
        );
        if (!alreadyExists) {
          const updatedList = [...partnerNames, newPartnerEntry];
          const { error } = await supabase
            .from('keepers')
            .update({ partner_names: updatedList })
            .eq('id', keeperId);
          if (error) throw error;
          setPartnerNames(updatedList);
        }
      }

      // Create the person record.
      const displayName = [titleCase(firstName.trim()), titleCase(lastName.trim())]
        .filter(Boolean)
        .join(' ');

      const newPerson = await createPerson({
        name: displayName,
        relationship,
        side: finalSide,
        generation: getGeneration(relationship),
      }, keeperId);

      onSuccess(newPerson);
    } catch (error) {
      console.error('Error adding person:', error);
      alert('Error adding person. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Build the Side dropdown options.
  // Always present: My Family, each named partner's family, Partner Family, No Relation.
  const sideOptions = [
    'My Family',
    ...partnerNames.map(p => `${p.first}'s Family`),
    'Partner Family',
    'No Relation',
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6">
      <div className="bg-white w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl mb-6" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
          Add a Person
        </h3>

        <div className="space-y-4">

          {/* First + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(titleCase(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(titleCase(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
            />
          </div>

          {/* Side (required) */}
          <select
            value={side}
            onChange={(e) => setSide(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
          >
            <option value="">Side *</option>
            {sideOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Relationship (required) */}
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
          >
            <option value="">Relationship *</option>
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

          {/* Partner's Name — only when adding a partner-side relative via
              generic "Partner Family" (not when the person IS the partner,
              and not when a named family is picked). */}
          {needsPartnerNameInput && (
            <div className="bg-gray-50 p-4 border border-gray-200">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Whose side? (Partner's Name)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={partnerFirstName}
                  onChange={(e) => setPartnerFirstName(titleCase(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={partnerLastName}
                  onChange={(e) => setPartnerLastName(titleCase(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 font-body focus:outline-none focus:border-black"
                />
              </div>
            </div>
          )}

        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-[#669999] text-white text-sm disabled:opacity-50"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}