import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPeople } from '../services/airtable';
import { getDisplayRelationship } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import EditPerson from './EditPerson';
import AddPersonQuick from './AddPersonQuick';
import PersonPhotoModal from './PersonPhotoModal';
import SiteHeader from './SiteHeader';

const RELATIONSHIP_GROUPS = {
  partner: ['Husband', 'Wife', 'Partner', 'Spouse/Partner', 'Spouse / Partner'],
  parents: ['Mother', 'Father', 'Parent'],
  grandparents: ['Grandmother', 'Grandfather', 'Grandparent'],
  greatGrandparents: ['Great-Grandmother', 'Great-Grandfather', 'Great-Grandparent'],
  siblings: ['Sister', 'Brother', 'Sibling'],
  children: ['Daughter', 'Son', 'Child'],
  extended: ['Aunt', 'Uncle', "Parent's Sibling", 'Cousin'],
  friends: ['Friend', 'Other'],
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PersonCard = ({ person, size = 'md', onEdit, onAddPhoto, partnerName }) => {
  const sizeMap = { lg: 'w-28 h-28', md: 'w-20 h-20', sm: 'w-16 h-16' };
  const textMap = { lg: 'text-2xl', md: 'text-xl', sm: 'text-base' };

  return (
    <div className="group flex flex-col items-center text-center relative">
      <Link to={`/person/${person.id}`} className="flex flex-col items-center">
        {person.photo ? (
          <img
            src={person.photo}
            alt={person.name}
            className={`${sizeMap[size]} rounded-full object-cover ring-1 ring-gray-200 group-hover:ring-[#669999] transition-all mb-2`}
          />
        ) : person.noPhoto ? (
          <div
            className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white ${textMap[size]} font-medium ring-1 ring-gray-200 group-hover:ring-[#669999] transition-all mb-2 flex-shrink-0`}
            style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}
          >
            {getInitials(person.name)}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onAddPhoto(person); }}
            className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white ${textMap[size]} font-medium ring-2 ring-dashed ring-[#B8A888] transition-all mb-2 flex-shrink-0 hover:ring-[#669999] relative`}
            style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}
          >
            {getInitials(person.name)}
            <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
          </button>
        )}
        <p className="text-sm font-medium leading-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>{person.name}</p>
        {person.relationship && (
          <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>{getDisplayRelationship(person.relationship, person.side, partnerName)}</p>
        )}
        {person.years && (
          <p className="text-xs text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>{person.years}</p>
        )}
      </Link>
      <button
        onClick={() => onEdit(person)}
        className="mt-1 text-xs text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Edit
      </button>
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-6 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
    {children}
  </h3>
);

const Origins = () => {
  const { keeperId } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [photoModalPerson, setPhotoModalPerson] = useState(null);

  const loadPeople = async () => {
    const data = await fetchPeople(keeperId);
    setPeople(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const keeper = people.find(p => p.relationship === 'Self');
  const partners = people.filter(p => RELATIONSHIP_GROUPS.partner.includes(p.relationship));
  const partnerName = partners[0]?.name.split(' ')[0] || null;

  const keeperSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && p.side === 'My Family');

  const partnerSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && p.side === 'Partner Family');

  const noSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && (!p.side || p.side === 'No Relation'));

  const friends = people.filter(p => RELATIONSHIP_GROUPS.friends.includes(p.relationship));

  const renderTwoColumn = (relationships, title) => {
    const keeperPeople = keeperSide(relationships);
    const partnerPeople = partnerSide(relationships);
    const unsided = noSide(relationships);

    if (keeperPeople.length === 0 && partnerPeople.length === 0 && unsided.length === 0) return null;

    return (
      <div className="mb-16">
        <SectionTitle>{title}</SectionTitle>
        {(keeperPeople.length > 0 || partnerPeople.length > 0) ? (
          <div className="grid grid-cols-2 gap-8">
            <div>
              {keeper && <p className="text-xs text-center text-gray-300 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{keeper.name}'s Family</p>}
              <div className="flex flex-wrap justify-center gap-6">
                {keeperPeople.map(p => <PersonCard key={p.id} person={p} size="sm" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
              </div>
            </div>
            <div>
              {partners[0] && <p className="text-xs text-center text-gray-300 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{partners[0].name}'s Family</p>}
              <div className="flex flex-wrap justify-center gap-6">
                {partnerPeople.map(p => <PersonCard key={p.id} person={p} size="sm" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {unsided.map(p => <PersonCard key={p.id} person={p} size="sm" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
          </div>
        )}
      </div>
    );
  };

  const renderCentered = (relationships, title) => {
    const group = people.filter(p => relationships.includes(p.relationship));
    if (group.length === 0) return null;
    return (
      <div className="mb-16">
        <SectionTitle>{title}</SectionTitle>
        <div className="flex flex-wrap justify-center gap-6">
          {group.map(p => <PersonCard key={p.id} person={p} size="sm" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SiteHeader />

      {editingPerson && (
        <EditPerson
          person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onSuccess={() => { setEditingPerson(null); loadPeople(); }}
          onCompleteLater={() => { setEditingPerson(null); loadPeople(); }}
        />
      )}

      {showAddPerson && (
        <AddPersonQuick
          onClose={() => setShowAddPerson(false)}
          onSuccess={async () => { await loadPeople(); setShowAddPerson(false); }}
        />
      )}

      {photoModalPerson && (
        <PersonPhotoModal
          person={photoModalPerson}
          onClose={() => setPhotoModalPerson(null)}
          onSuccess={() => { setPhotoModalPerson(null); loadPeople(); }}
        />
      )}

      <div className="max-w-[900px] mx-auto px-4 md:px-12 py-16">

        {/* Page Title */}
        <div className="flex items-center justify-between mb-16">
          <button onClick={() => navigate('/viewer')} className="text-sm text-gray-400 hover:text-black transition-colors w-24" style={{ fontFamily: 'Roboto, sans-serif' }}>← Back</button>
          <h1 className="text-4xl font-heading italic tracking-[0.05em]">Connections</h1>
          <div className="w-24" />
        </div>

        {/* Keeper + Partners */}
        {(keeper || partners.length > 0) && (
          <div className="mb-16">
            <div className="flex flex-wrap justify-center gap-10">
              {keeper && <PersonCard person={keeper} size="lg" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />}
              {partners.map(p => <PersonCard key={p.id} person={p} size="lg" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
            </div>
          </div>
        )}

        {/* Parents */}
        {renderTwoColumn(RELATIONSHIP_GROUPS.parents, 'Parents')}

        {/* Grandparents */}
        {renderTwoColumn(RELATIONSHIP_GROUPS.grandparents, 'Grandparents')}

        {/* Great-Grandparents */}
        {renderTwoColumn(RELATIONSHIP_GROUPS.greatGrandparents, 'Great-Grandparents')}

        {/* Siblings */}
        {renderCentered(RELATIONSHIP_GROUPS.siblings, 'Siblings')}

        {/* Children */}
        {renderCentered(RELATIONSHIP_GROUPS.children, 'Children')}

        {/* Extended */}
        {renderCentered(RELATIONSHIP_GROUPS.extended, 'Extended Family')}

        {/* Friends */}
        {friends.length > 0 && (
          <>
            <div className="border-t border-[#B8A888] my-12" />
            <div className="mb-16">
              <SectionTitle>Friends</SectionTitle>
              <div className="flex flex-wrap justify-center gap-6">
                {friends.map(p => <PersonCard key={p.id} person={p} size="sm" onEdit={setEditingPerson} onAddPhoto={setPhotoModalPerson} partnerName={partnerName} />)}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Origins;
