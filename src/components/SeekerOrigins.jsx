import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPeople } from '../services/airtable';
import { getPersonalizedLabel } from './SeekerGallery';
import { useAuth } from '../context/AuthContext';
import SeekerHeader from './SeekerHeader';

const RELATIONSHIP_GROUPS = {
  partner: ['Partner'],
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

export default function SeekerOrigins() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, seekerName, connections } = useAuth();
const seekerGeneration = connections[slug]?.generation ?? 0;

useEffect(() => {
  if (!user) { navigate(`/s/${slug}`); return; }
  if (!connections[slug]) { navigate(`/s/${slug}`); return; }
  loadPeople();
}, [user, connections, slug]);

  const loadPeople = async () => {
    const keeperId = connections[slug]?.keeperId;
    const data = await fetchPeople(keeperId);
    setPeople(data);
    setLoading(false);
  };

  const keeper = people.find(p => p.relationship === 'Self');
const keeperName = keeper?.name || slug.replace(/-/g, ' ');
  const partners = people.filter(p => RELATIONSHIP_GROUPS.partner.includes(p.relationship));

  const keeperSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && p.side === 'My Family');

  const partnerSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && p.side === 'Partner Family');

  const noSide = (relationships) =>
    people.filter(p => relationships.includes(p.relationship) && (!p.side || p.side === 'No Relation'));

  const friends = people.filter(p => RELATIONSHIP_GROUPS.friends.includes(p.relationship));

  const PersonCard = ({ person, size = 'md' }) => {
    const sizeMap = { lg: 'w-28 h-28', md: 'w-20 h-20', sm: 'w-16 h-16' };
    const textMap = { lg: 'text-2xl', md: 'text-xl', sm: 'text-base' };

    const label = getPersonalizedLabel(
  person.relationship,
  person.generation || 0,
  seekerGeneration,
  person.side,
  keeperName
);

    return (
      <div className="flex flex-col items-center text-center">
        <Link to={`/s/${slug}/person/${person.id}`}>
          {person.photo ? (
            <img
              src={person.photo}
              alt={person.name}
              className={`${sizeMap[size]} rounded-full object-cover ring-1 ring-gray-200 hover:ring-[#669999] transition-all mb-2`}
            />
          ) : (
            <div
              className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white ${textMap[size]} font-medium ring-1 ring-gray-200 hover:ring-[#669999] transition-all mb-2 flex-shrink-0`}
              style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}
            >
              {getInitials(person.name)}
            </div>
          )}
          <p className="text-sm font-medium leading-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>{person.name}</p>
          {label && (
            <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>{label}</p>
          )}
          {person.years && (
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>{person.years}</p>
          )}
        </Link>
      </div>
    );
  };

  const SectionTitle = ({ children }) => (
    <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-6 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {children}
    </h3>
  );

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
                {keeperPeople.map(p => <PersonCard key={p.id} person={p} size="sm" />)}
              </div>
            </div>
            <div>
              {partners[0] && <p className="text-xs text-center text-gray-300 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{partners[0].name}'s Family</p>}
              <div className="flex flex-wrap justify-center gap-6">
                {partnerPeople.map(p => <PersonCard key={p.id} person={p} size="sm" />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {unsided.map(p => <PersonCard key={p.id} person={p} size="sm" />)}
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
          {group.map(p => <PersonCard key={p.id} person={p} size="sm" />)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <SeekerHeader slug={slug} seekerName={seekerName} />

      <div className="max-w-[900px] mx-auto px-4 md:px-12 py-16">

        <div className="flex items-center justify-between mb-16">
          <button onClick={() => navigate(`/s/${slug}/gallery`)} className="text-sm text-gray-400 hover:text-black transition-colors w-24" style={{ fontFamily: 'Roboto, sans-serif' }}>← Back</button>
          <h1 className="text-4xl font-heading italic tracking-[0.05em]">Connections</h1>
          <div className="w-24" />
        </div>

        {/* Keeper + Partners */}
        {(keeper || partners.length > 0) && (
          <div className="mb-16">
            <div className="flex flex-wrap justify-center gap-10">
              {keeper && <PersonCard person={keeper} size="lg" />}
              {partners.map(p => <PersonCard key={p.id} person={p} size="lg" />)}
            </div>
          </div>
        )}

        {renderTwoColumn(RELATIONSHIP_GROUPS.parents, 'Parents')}
        {renderTwoColumn(RELATIONSHIP_GROUPS.grandparents, 'Grandparents')}
        {renderTwoColumn(RELATIONSHIP_GROUPS.greatGrandparents, 'Great-Grandparents')}
        {renderCentered(RELATIONSHIP_GROUPS.siblings, 'Siblings')}
        {renderCentered(RELATIONSHIP_GROUPS.children, 'Children')}
        {renderCentered(RELATIONSHIP_GROUPS.extended, 'Extended Family')}

        {friends.length > 0 && (
          <>
            <div className="border-t border-[#B8A888] my-12" />
            <div className="mb-16">
              <SectionTitle>Friends</SectionTitle>
              <div className="flex flex-wrap justify-center gap-6">
                {friends.map(p => <PersonCard key={p.id} person={p} size="sm" />)}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
