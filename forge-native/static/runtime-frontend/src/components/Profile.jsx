/**
 * Profile Page
 * User profile view/edit functionality
 */

import { useState, useMemo } from 'react';
import {
  Crown,
  ChevronRight,
  Users,
  User,
  Check,
  X,
  Plus,
  Zap,
  Activity,
} from 'lucide-react';
import { cn, getSkillClasses } from '../lib/design-system';
import { SKILLS, MAX_SKILLS } from '../data/constants';
import { 
  Card, 
  Button, 
  Avatar, 
  Input, 
  TextArea,
  Modal,
  Badge,
  ProfileSkeleton,
} from './ui';
import { VStack, HStack } from './layout';
import { BackButton } from './shared';

// Validation for callsign
const validateCallsign = (value) => {
  if (value.length > 20) return 'Max 20 characters';
  if (!/^[a-zA-Z0-9 ]*$/.test(value)) return 'Letters, numbers, and spaces only';
  return null;
};

function Profile({
  user,
  updateUser,
  teams = [],
  onNavigate,
  eventPhase,
  isLoading = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [callsign, setCallsign] = useState(user?.callsign || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [callsignError, setCallsignError] = useState(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  // Find user's team
  const userTeam = useMemo(() => {
    if (!user?.id) return null;
    return teams.find((team) => 
      team.captainId === user.id || 
      team.members?.some(m => m.id === user.id)
    );
  }, [user?.id, teams]);

  const isCaptain = userTeam?.captainId === user?.id;

  // Show skeleton while loading
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const handleCallsignChange = (e) => {
    const value = e.target.value;
    setCallsign(value);
    setCallsignError(validateCallsign(value));
  };

  const handleSave = () => {
    if (callsignError) return;
    
    updateUser?.({
      callsign: callsign.trim() || null,
      bio: bio.trim() || null,
      skills,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCallsign(user?.callsign || '');
    setBio(user?.bio || '');
    setSkills(user?.skills || []);
    setCallsignError(null);
    setIsEditing(false);
  };

  const toggleSkill = (skill) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else if (skills.length < MAX_SKILLS) {
      setSkills([...skills, skill]);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Profile
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
              Your Profile
            </h1>
            <p className="text-text-secondary max-w-2xl">
              Keep your details current so teammates can find and collaborate with you.
            </p>
          </div>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <HStack gap="2">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!!callsignError}>
                Save Changes
              </Button>
            </HStack>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar user={user} size="xl" />
                {user?.role && user.role !== 'participant' && (
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 text-xs font-bold bg-brand text-white rounded-full capitalize">
                    {user.role}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-black text-text-primary mb-1">
                  {user?.name || 'User'}
                </h2>
                
                {/* Callsign */}
                {isEditing ? (
                  <Input
                    label="Callsign"
                    value={callsign}
                    onChange={handleCallsignChange}
                    error={callsignError}
                    placeholder="Enter a callsign (optional)"
                    helperText="Your nickname for HackDay"
                    className="mt-4"
                  />
                ) : callsign ? (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Zap className="w-4 h-4" />
                    <span className="italic">"{callsign}"</span>
                  </div>
                ) : null}

                {/* Status Pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {userTeam ? (
                    <Badge variant="success">
                      {isCaptain ? 'Team Captain' : 'Team Member'}
                    </Badge>
                  ) : (
                    <Badge variant="warning">Free Agent</Badge>
                  )}
                  <Badge variant="default">{user?.role || 'Participant'}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Bio */}
          <Card padding="lg">
            <Card.Title>About Me</Card.Title>
            {isEditing ? (
              <TextArea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
              />
            ) : bio ? (
              <p className="text-text-secondary">{bio}</p>
            ) : (
              <p className="text-text-muted italic">No bio added yet.</p>
            )}
          </Card>

          {/* Skills */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <Card.Title className="mb-0">Skills</Card.Title>
              {isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowSkillModal(true)}
                >
                  Add Skills
                </Button>
              )}
            </div>
            
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border',
                      getSkillClasses(skill),
                      isEditing && 'cursor-pointer hover:opacity-75'
                    )}
                    onClick={() => isEditing && toggleSkill(skill)}
                  >
                    {skill}
                    {isEditing && (
                      <X className="w-3 h-3 ml-2 inline" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted italic">No skills added yet.</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team Card */}
          <Card padding="lg">
            <Card.Title>Your Team</Card.Title>
            {userTeam ? (
              <div>
                <div className="flex items-center gap-3 p-3 bg-arena-elevated rounded-lg mb-4">
                  <div className="w-10 h-10 rounded-lg bg-arena-card flex items-center justify-center">
                    <Users className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{userTeam.name}</p>
                    <p className="text-xs text-text-muted">
                      {isCaptain ? 'You are the captain' : 'Team member'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  fullWidth
                  onClick={() => onNavigate('team-detail', { teamId: userTeam.id })}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  View Team
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <User className="w-12 h-12 mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary mb-4">
                  You're not on a team yet
                </p>
                <Button 
                  fullWidth
                  onClick={() => onNavigate('marketplace')}
                >
                  Browse Ideas
                </Button>
              </div>
            )}
          </Card>

          {/* Activity */}
          <Card padding="lg">
            <Card.Title>Recent Activity</Card.Title>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <Activity className="w-4 h-4" />
                <span>Profile created</span>
              </div>
              {userTeam && (
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Users className="w-4 h-4" />
                  <span>Joined {userTeam.name}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Skill Selection Modal */}
      <Modal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        title="Select Skills"
        description={`Choose up to ${MAX_SKILLS} skills (${skills.length}/${MAX_SKILLS} selected)`}
      >
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {SKILLS.map((skill) => {
            const isSelected = skills.includes(skill);
            const canAdd = skills.length < MAX_SKILLS || isSelected;
            
            return (
              <button
                key={skill}
                type="button"
                onClick={() => canAdd && toggleSkill(skill)}
                disabled={!canAdd && !isSelected}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border text-left transition-all',
                  isSelected
                    ? 'bg-brand/20 border-brand text-brand'
                    : 'bg-arena-elevated border-arena-border text-text-secondary hover:border-arena-border-strong',
                  !canAdd && !isSelected && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{skill}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSkillModal(false)}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Profile;
