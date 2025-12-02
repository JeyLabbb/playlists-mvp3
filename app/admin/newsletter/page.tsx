'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Contact = {
  id: string;
  email: string;
  name?: string;
  status?: string;
  origin?: string;
  subscribed_at?: string;
  groups?: string[];
  plan?: string;
  is_founder?: boolean;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  is_default?: boolean;
};

type Campaign = {
  id: string;
  title: string;
  subject: string;
  status: string;
  send_mode: string;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
  stats?: { total: number; sent: number; opened: number; clicked: number };
};

type Workflow = {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  is_active: boolean;
  steps: Array<{ id: string; step_order: number; action_type: string; action_config: Record<string, any> }>;
};

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Usuarios' },
  { key: 'groups', label: 'Grupos' },
  { key: 'campaigns', label: 'Campañas' },
  { key: 'templates', label: 'Plantillas' },
  { key: 'saved', label: 'Mails guardados' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'tracking', label: 'Tracking' },
] as const;

export default function NewsletterAdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('overview');
  const [mailDetailId, setMailDetailId] = useState<string | null>(null);

  const [contactSearch, setContactSearch] = useState('');
  const [contactFilters, setContactFilters] = useState({
    status: '',
    plan: '',
    founder: '',
    from: '',
    to: '',
    groupId: '',
  });

  const contactsQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (contactSearch) params.set('q', contactSearch);
    if (contactFilters.groupId) params.set('groupId', contactFilters.groupId);
    if (contactFilters.status) params.set('status', contactFilters.status);
    if (contactFilters.plan) params.set('plan', contactFilters.plan);
    if (contactFilters.founder) params.set('isFounder', contactFilters.founder);
    if (contactFilters.from) params.set('from', contactFilters.from);
    if (contactFilters.to) params.set('to', contactFilters.to);
    return `/api/admin/newsletter/contacts?${params.toString()}`;
  }, [contactSearch, contactFilters]);

  const {
    data: contactsResponse,
    isLoading: contactsLoading,
    mutate: mutateContacts,
  } = useSWR(contactsQuery, fetcher);

  const {
    data: groupsResponse,
    isLoading: groupsLoading,
    mutate: mutateGroups,
  } = useSWR('/api/admin/newsletter/groups', fetcher);

  const {
    data: campaignsResponse,
    isLoading: campaignsLoading,
    mutate: mutateCampaigns,
  } = useSWR('/api/admin/newsletter/campaigns?limit=20', fetcher);

  const {
    data: workflowsResponse,
    isLoading: workflowsLoading,
    mutate: mutateWorkflows,
  } = useSWR('/api/admin/newsletter/workflows', fetcher);

  const { data: analyticsResponse, isLoading: analyticsLoading, mutate: mutateAnalytics } = useSWR(
    '/api/admin/newsletter/analytics',
    fetcher,
  );
  const {
    data: jobsResponse,
    isLoading: jobsLoading,
    mutate: mutateJobs,
  } = useSWR('/api/admin/newsletter/jobs?status=pending', fetcher);

  const pendingJobs = jobsResponse?.jobs || [];
  const {
    data: templatesResponse,
    isLoading: templatesLoading,
    mutate: mutateTemplates,
  } = useSWR('/api/admin/newsletter/templates', fetcher);
  const templates = templatesResponse?.templates || [];
  const {
    data: savedMailsResponse,
    isLoading: savedMailsLoading,
    mutate: mutateSavedMails,
  } = useSWR('/api/admin/newsletter/saved-mails', fetcher);
  const savedMails = savedMailsResponse?.mails || [];

  const contacts: Contact[] = useMemo(
    () => contactsResponse?.contacts ?? [],
    [contactsResponse],
  );
  const groups: Group[] = groupsResponse?.groups || [];
  const campaigns: Campaign[] = useMemo(
    () => campaignsResponse?.campaigns ?? [],
    [campaignsResponse],
  );
  const workflows: Workflow[] = useMemo(
    () => workflowsResponse?.workflows ?? [],
    [workflowsResponse],
  );

  /**
   * CONTACTS TAB STATE
   */
  const filteredContacts = contacts;

  const [contactForm, setContactForm] = useState<{ email: string; name: string; groupIds: string[] }>({
    email: '',
    name: '',
    groupIds: [],
  });
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>({});
  const selectedContactsCount = Object.values(selectedContacts).filter(Boolean).length;
  const selectedContactIds = useMemo(
    () =>
      contacts
        .filter((contact) => selectedContacts[contact.id])
        .map((contact) => contact.id),
    [contacts, selectedContacts],
  );
  const selectedContactEmails = useMemo(
    () =>
      contacts
        .filter((contact) => selectedContacts[contact.id])
        .map((contact) => contact.email),
    [contacts, selectedContacts],
  );
  const [bulkGroupId, setBulkGroupId] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const handleSyncContacts = useCallback(async () => {
    setSyncingContacts(true);
    setSyncMessage(null);
    try {
      const response = await fetch('/api/admin/newsletter/contacts/sync', {
        method: 'POST',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudo sincronizar');
      }
      setSyncMessage(`Sincronizados ${json.synced} contactos.`);
      mutateContacts();
    } catch (error: any) {
      setSyncMessage(error?.message || 'Error sincronizando contactos');
    } finally {
      setSyncingContacts(false);
    }
  }, [mutateContacts]);

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }));
  };

  const selectAllContacts = () => {
    const next: Record<string, boolean> = {};
    filteredContacts.forEach((contact) => {
      next[contact.id] = true;
    });
    setSelectedContacts(next);
  };

  const clearContactSelection = () => {
    setSelectedContacts({});
  };

  const handleCreateContact = async () => {
    if (!contactForm.email) return;
    const response = await fetch('/api/admin/newsletter/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: contactForm.email,
        name: contactForm.name || undefined,
        groupIds: contactForm.groupIds,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      alert(json.error || 'No se pudo crear el contacto');
      return;
    }
    setContactForm({ email: '', name: '', groupIds: [] });
    mutateContacts();
    mutateGroups();
  };

  const handleBulkGroupAction = async (mode: 'add' | 'remove') => {
    if (!bulkGroupId || !selectedContactIds.length) {
      setBulkActionMessage('Selecciona contactos y un grupo.');
      return;
    }
    setBulkActionLoading(true);
    setBulkActionMessage(null);
    try {
      const response = await fetch('/api/admin/newsletter/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContactIds,
          action: mode === 'add' ? 'add-group' : 'remove-group',
          groupId: bulkGroupId,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudo aplicar la acción');
      }
      setBulkActionMessage(
        mode === 'add'
          ? `Añadidos ${selectedContactIds.length} contactos al grupo`
          : `Eliminados del grupo ${selectedContactIds.length} contactos`,
      );
      mutateContacts();
      mutateGroups();
    } catch (error: any) {
      setBulkActionMessage(error?.message || 'Error en la acción masiva');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnsubscribe = async () => {
    if (!selectedContactIds.length) {
      setBulkActionMessage('Selecciona contactos para pausar.');
      return;
    }
    setBulkActionLoading(true);
    setBulkActionMessage(null);
    try {
      const response = await fetch('/api/admin/newsletter/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContactIds,
          action: 'unsubscribe',
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudo pausar');
      }
      setBulkActionMessage(`Se pausaron ${selectedContactIds.length} contactos`);
      mutateContacts();
    } catch (error: any) {
      setBulkActionMessage(error?.message || 'Error al pausar');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportContacts = (scope: 'selection' | 'filtered') => {
    const dataset =
      scope === 'selection'
        ? contacts.filter((contact) => selectedContacts[contact.id])
        : filteredContacts;
    if (!dataset.length) {
      setBulkActionMessage('No hay contactos para exportar');
      return;
    }
    const header = ['email', 'name', 'status', 'origin', 'groups'];
    const rows = dataset.map((contact) => [
      contact.email,
      contact.name || '',
      contact.status || '',
      contact.origin || '',
      (contact.groups || [])
        .map((groupId) => groups.find((g) => g.id === groupId)?.name || '')
        .filter(Boolean)
        .join(';'),
    ]);
    const csv = [header, ...rows].map((cols) => cols.map((col) => `"${col.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = scope === 'selection' ? 'newsletter_selection.csv' : 'newsletter_filtered.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUseSelectionInCampaign = () => {
    if (!selectedContactEmails.length) {
      setBulkActionMessage('Selecciona contactos primero');
      return;
    }
    setCampaignForm((prev) => ({
      ...prev,
      recipientEmails: selectedContactEmails.join(', '),
    }));
    setActiveTab('campaigns');
  };

  /**
   * GROUPS TAB STATE
   */
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersEmail, setGroupMembersEmail] = useState('');
  const handleCreateGroup = async () => {
    if (!groupForm.name) return;
    const response = await fetch('/api/admin/newsletter/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupForm),
    });
    const json = await response.json();
    if (!response.ok) {
      alert(json.error || 'No se pudo crear el grupo');
      return;
    }
    setGroupForm({ name: '', description: '' });
    mutateGroups();
  };

  const handleOpenGroup = async (groupId: string) => {
    setActiveGroupId(groupId);
    setGroupMembers([]);
    setGroupMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/newsletter/groups/${groupId}/members`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'No se pudieron cargar los miembros del grupo');
      }
      setGroupMembers(json.members || []);
    } catch (error) {
      console.error('[Newsletter] group members error:', error);
    } finally {
      setGroupMembersLoading(false);
    }
  };

  /**
   * CAMPAIGNS TAB STATE
   */
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    subject: '',
    preheader: '',
    body: '',
    primaryLabel: '',
    primaryUrl: '',
    secondaryLabel: '',
    secondaryUrl: '',
    groupIds: [] as string[],
    recipientEmails: '',
    selectedUserEmails: [] as string[], // Nueva propiedad para emails seleccionados
    sendMode: 'draft',
    scheduledFor: '',
    templateMode: 'custom' as 'custom' | 'pleia' | 'minimal',
    trackingEnabled: true,
    // A/B Testing
    abTestEnabled: false,
    subjectB: '',
    testDuration: 24,
    testDurationUnit: 'hours' as 'hours' | 'days',
    winnerCriteria: 'opens' as 'opens' | 'clicks' | 'ctr' | 'combined',
    // Categorización
    mailCategory: 'general' as 'welcome' | 'founder' | 'update' | 'general' | 'promo',
  });
  
  // Estados para el selector mejorado
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientMode, setRecipientMode] = useState<'groups' | 'users' | 'manual'>('groups');
  
  // Estados para email de prueba
  const [testEmailAddress, setTestEmailAddress] = useState('jeylabbb@gmail.com');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    isDefault: false,
  });
  const [templateActionMessage, setTemplateActionMessage] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [savedMailForm, setSavedMailForm] = useState({
    name: '',
    description: '',
    subject: '',
    body: '',
    category: 'welcome',
    status: 'draft',
    templateId: '',
    templateMode: 'custom' as 'custom' | 'pleia',
  });
  const [savedMailMessage, setSavedMailMessage] = useState<string | null>(null);
  const [savedMailSaving, setSavedMailSaving] = useState(false);

  const handleSendTestEmail = async (campaign?: any) => {
    setSendingTestEmail(true);
    setTestEmailMessage(null);
    
    try {
      const payload = campaign || {
        subject: campaignForm.subject || 'Email de prueba',
        title: campaignForm.title || 'Test',
        body: campaignForm.body || 'Este es un email de prueba',
        primaryCta: campaignForm.primaryLabel && campaignForm.primaryUrl ? {
          label: campaignForm.primaryLabel,
          url: campaignForm.primaryUrl,
        } : undefined,
        secondaryCta: campaignForm.secondaryLabel && campaignForm.secondaryUrl && campaignForm.templateMode !== 'minimal' ? {
          label: campaignForm.secondaryLabel,
          url: campaignForm.secondaryUrl,
        } : undefined,
        templateMode: campaign?.template_mode || campaignForm.templateMode,
      };

      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: campaign?.subject || payload.subject,
          title: campaign?.title || payload.title,
          message: campaign?.body || payload.body,
          previewOnly: true,
          recipientEmails: [testEmailAddress],
          primaryCta: campaign ? 
            (campaign.primary_cta_label && campaign.primary_cta_url ? {
              label: campaign.primary_cta_label,
              url: campaign.primary_cta_url,
            } : undefined) : payload.primaryCta,
          secondaryCta: campaign ? 
            (campaign.secondary_cta_label && campaign.secondary_cta_url ? {
              label: campaign.secondary_cta_label,
              url: campaign.secondary_cta_url,
            } : undefined) : payload.secondaryCta,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestEmailMessage(`✅ Email de prueba enviado a ${testEmailAddress}`);
      } else {
        setTestEmailMessage(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      setTestEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.title || !campaignForm.subject || !campaignForm.body) {
      alert('Completa título, asunto y cuerpo');
      return;
    }
    
    // Combinar emails seleccionados y manuales
    const manualEmails = campaignForm.recipientEmails
      ? campaignForm.recipientEmails.split(',').map((email) => email.trim()).filter(Boolean)
      : [];
    const allEmails = Array.from(new Set([...campaignForm.selectedUserEmails, ...manualEmails]));
    
    const payload: any = {
      title: campaignForm.title,
      subject: campaignForm.subject,
      preheader: campaignForm.preheader || undefined,
      body: campaignForm.body,
      groupIds: campaignForm.groupIds,
      recipientEmails: allEmails.length > 0 ? allEmails : undefined,
      sendMode: campaignForm.sendMode,
      scheduledFor: campaignForm.sendMode === 'scheduled' ? campaignForm.scheduledFor || undefined : undefined,
      trackingEnabled: campaignForm.trackingEnabled,
      mailCategory: campaignForm.mailCategory,
      // A/B Testing
      abTestEnabled: campaignForm.abTestEnabled,
      subjectB: campaignForm.abTestEnabled ? campaignForm.subjectB : undefined,
      testDuration: campaignForm.abTestEnabled ? campaignForm.testDuration : undefined,
      testDurationUnit: campaignForm.abTestEnabled ? campaignForm.testDurationUnit : undefined,
      winnerCriteria: campaignForm.abTestEnabled ? campaignForm.winnerCriteria : undefined,
    };
    if (campaignForm.templateMode === 'pleia') {
      payload.primaryCta = {
        label: campaignForm.primaryLabel || 'Crear playlist con IA',
        url: campaignForm.primaryUrl || 'https://playlists.jeylabbb.com',
      };
      payload.secondaryCta = {
        label: campaignForm.secondaryLabel || 'Explorar trending',
        url: campaignForm.secondaryUrl || 'https://playlists.jeylabbb.com/trending',
      };
    } else if (campaignForm.templateMode === 'minimal') {
      if (campaignForm.primaryLabel && campaignForm.primaryUrl) {
        payload.primaryCta = { label: campaignForm.primaryLabel, url: campaignForm.primaryUrl };
      }
      // Sin CTA secundario en minimal
    } else {
      if (campaignForm.primaryLabel && campaignForm.primaryUrl) {
      payload.primaryCta = { label: campaignForm.primaryLabel, url: campaignForm.primaryUrl };
      }
      if (campaignForm.secondaryLabel && campaignForm.secondaryUrl) {
        payload.secondaryCta = { label: campaignForm.secondaryLabel, url: campaignForm.secondaryUrl };
      }
    }

    setCampaignSending(true);
    const response = await fetch('/api/admin/newsletter/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setCampaignSending(false);
    if (!response.ok) {
      alert(json.error || 'No se pudo crear la campaña');
      return;
    }
    setCampaignForm({
      title: '',
      subject: '',
      preheader: '',
      body: '',
      primaryLabel: '',
      primaryUrl: '',
      secondaryLabel: '',
      secondaryUrl: '',
      groupIds: [],
      recipientEmails: '',
      selectedUserEmails: [],
      sendMode: 'draft',
      scheduledFor: '',
      templateMode: 'pleia',
      trackingEnabled: true,
      abTestEnabled: false,
      subjectB: '',
      testDuration: 24,
      testDurationUnit: 'hours',
      winnerCriteria: 'opens',
      mailCategory: 'general',
    });
    setRecipientSearch('');
    setRecipientMode('groups');
    setTestEmailMessage(null);
    mutateCampaigns();
    mutateContacts();
  };

  const handleApplyTemplate = useCallback((template: any) => {
    setCampaignForm((prev) => ({
      ...prev,
      title: template.name || prev.title,
      subject: template.subject || prev.subject,
      body: template.body || prev.body,
      primaryLabel: template.primary_cta?.label || prev.primaryLabel,
      primaryUrl: template.primary_cta?.url || prev.primaryUrl,
      secondaryLabel: template.secondary_cta?.label || prev.secondaryLabel,
      secondaryUrl: template.secondary_cta?.url || prev.secondaryUrl,
      templateMode: 'custom',
    }));
    setTemplateActionMessage(`✅ Plantilla "${template.name}" aplicada al compositor.`);
    // Cambiar a la pestaña de campañas para que el usuario vea el resultado
    setTimeout(() => {
      setActiveTab('campaigns');
    }, 500);
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateForm.name || !campaignForm.body) {
      setTemplateActionMessage('Añade un nombre y cuerpo antes de guardar.');
      return;
    }
    setTemplateSaving(true);
    setTemplateActionMessage(null);
    try {
      const response = await fetch('/api/admin/newsletter/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateForm.name,
          description: templateForm.description || undefined,
          subject: campaignForm.subject || undefined,
          body: campaignForm.body,
          primaryCta:
            campaignForm.templateMode === 'pleia'
              ? undefined
              : campaignForm.primaryLabel && campaignForm.primaryUrl
                ? { label: campaignForm.primaryLabel, url: campaignForm.primaryUrl }
                : undefined,
          secondaryCta:
            campaignForm.templateMode === 'pleia'
              ? undefined
              : campaignForm.secondaryLabel && campaignForm.secondaryUrl
                ? { label: campaignForm.secondaryLabel, url: campaignForm.secondaryUrl }
                : undefined,
          isDefault: templateForm.isDefault,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudo guardar la plantilla');
      }
      setTemplateActionMessage('Plantilla guardada correctamente.');
      setTemplateForm({ name: '', description: '', isDefault: false });
      mutateTemplates();
    } catch (error: any) {
      setTemplateActionMessage(error?.message || 'Error al guardar la plantilla');
    } finally {
      setTemplateSaving(false);
    }
  }, [campaignForm, templateForm, mutateTemplates]);

  const handleUpdateTemplate = useCallback(
    async (templateId: string, updates: Record<string, any>) => {
      try {
        const response = await fetch(`/api/admin/newsletter/templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.error || 'No se pudo actualizar la plantilla');
        }
        mutateTemplates();
      } catch (error) {
        console.error('[Newsletter] update template error', error);
      }
    },
    [mutateTemplates],
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (!confirm('¿Eliminar esta plantilla?')) return;
      try {
        const response = await fetch(`/api/admin/newsletter/templates/${templateId}`, {
          method: 'DELETE',
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.error || 'No se pudo eliminar la plantilla');
        }
        mutateTemplates();
      } catch (error) {
        console.error('[Newsletter] delete template error', error);
      }
    },
    [mutateTemplates],
  );

  const handleSaveMail = useCallback(async () => {
    if (!savedMailForm.name || !savedMailForm.body) {
      setSavedMailMessage('Añade nombre y cuerpo para guardar.');
      return;
    }
    setSavedMailSaving(true);
    setSavedMailMessage(null);
    try {
      const response = await fetch('/api/admin/newsletter/saved-mails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: savedMailForm.name,
          description: savedMailForm.description || undefined,
          subject: savedMailForm.subject || undefined,
          body: savedMailForm.body,
          category: savedMailForm.category,
          status: savedMailForm.status as 'draft' | 'published',
          templateId: savedMailForm.templateId && savedMailForm.templateId !== '__pleia__'
            ? savedMailForm.templateId
            : undefined,
          templateMode: savedMailForm.templateMode,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudo guardar el mail');
      }
      setSavedMailMessage('Mail guardado.');
      setSavedMailForm({
        name: '',
        description: '',
        subject: '',
        body: '',
        category: 'welcome',
        status: 'draft',
        templateId: '',
        templateMode: 'pleia',
      });
      mutateSavedMails();
    } catch (error: any) {
      setSavedMailMessage(error?.message || 'Error al guardar el mail');
    } finally {
      setSavedMailSaving(false);
    }
  }, [savedMailForm, mutateSavedMails]);

  const handleUpdateSavedMail = useCallback(
    async (mailId: string, updates: Record<string, any>) => {
      try {
        const response = await fetch(`/api/admin/newsletter/saved-mails/${mailId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.error || 'No se pudo actualizar el mail');
        }
        mutateSavedMails();
      } catch (error) {
        console.error('[Newsletter] update saved mail error', error);
      }
    },
    [mutateSavedMails],
  );

  const handleDeleteSavedMail = useCallback(
    async (mailId: string) => {
      if (!confirm('¿Eliminar este mail guardado?')) return;
      try {
        const response = await fetch(`/api/admin/newsletter/saved-mails/${mailId}`, {
          method: 'DELETE',
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.error || 'No se pudo eliminar el mail');
        }
        mutateSavedMails();
      } catch (error) {
        console.error('[Newsletter] delete saved mail error', error);
      }
    },
    [mutateSavedMails],
  );

  const handleApplySavedMail = useCallback(
    (mail: any) => {
      setCampaignForm((prev) => ({
        ...prev,
        title: mail.name || prev.title,
        subject: mail.subject || prev.subject,
        body: mail.body || prev.body,
        templateMode:
          (mail.metadata && mail.metadata.templateMode === 'pleia') || mail.template_id === '__pleia__'
            ? 'pleia'
            : mail.template_id
              ? 'custom'
              : prev.templateMode,
      }));
      setSavedMailMessage(`Mail "${mail.name}" aplicado al compositor.`);
      setActiveTab('campaigns');
    },
    [],
  );

  /**
   * WORKFLOWS TAB STATE
   */
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    is_active: true,
    steps: [] as { action_type: string; action_config: any }[],
  });

  const addWorkflowStep = (type: string) => {
    setWorkflowForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { action_type: type, action_config: {} }],
    }));
  };

  const updateWorkflowStep = (index: number, config: any) => {
    setWorkflowForm((prev) => {
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], action_config: { ...steps[index].action_config, ...config } };
      return { ...prev, steps };
    });
  };

  const removeWorkflowStep = (index: number) => {
    setWorkflowForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleCreateWorkflow = async () => {
    if (!workflowForm.name || workflowForm.steps.length === 0) {
      alert('Añade nombre y al menos un paso');
      return;
    }
    const response = await fetch('/api/admin/newsletter/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowForm),
    });
    const json = await response.json();
    if (!response.ok) {
      alert(json.error || 'No se pudo crear el workflow');
      return;
    }
    setWorkflowForm({
      name: '',
      description: '',
      trigger_type: 'manual',
      is_active: true,
      steps: [],
    });
    mutateWorkflows();
  };

  /**
   * TRACKING DATA
   */
  const trackingSummary = analyticsResponse?.summary || { delivered: 0, opened: 0, clicked: 0 };
  const trackingDaily = analyticsResponse?.daily || [];
  const trackingRates = analyticsResponse?.rates || { openRate: 0, clickRate: 0 };

  // Campaign detail drawer
  const [campaignDetailId, setCampaignDetailId] = useState<string | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<any[]>([]);
  const [campaignRecipientsLoading, setCampaignRecipientsLoading] = useState(false);
  const campaignDetail = useMemo(
    () => campaigns.find((c) => c.id === campaignDetailId) || null,
    [campaigns, campaignDetailId],
  );

  const openCampaignDetail = useCallback(async (campaignId: string) => {
    setCampaignDetailId(campaignId);
    setCampaignRecipients([]);
    setCampaignRecipientsLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${campaignId}/recipients`);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudieron cargar los destinatarios');
      }
      setCampaignRecipients(json.recipients || []);
    } catch (error) {
      console.error('[Newsletter] load campaign recipients error:', error);
    } finally {
      setCampaignRecipientsLoading(false);
    }
  }, []);

  const closeCampaignDetail = () => {
    setCampaignDetailId(null);
    setCampaignRecipients([]);
  };

  // Workflow detail drawer
  const [workflowDetailId, setWorkflowDetailId] = useState<string | null>(null);
  const workflowDetail = useMemo(
    () => workflows.find((w) => w.id === workflowDetailId) || null,
    [workflows, workflowDetailId],
  );

  const handleRunJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter/jobs/run', {
        method: 'POST',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'No se pudieron ejecutar los jobs');
      }
      mutateJobs();
    } catch (error) {
      console.error('[Newsletter] run jobs error:', error);
    }
  }, [mutateJobs]);

  useEffect(() => {
    if (contacts.length && Object.keys(selectedContacts).length === 0) {
      const init: Record<string, boolean> = {};
      contacts.forEach((contact) => {
        init[contact.id] = false;
      });
      setSelectedContacts(init);
    }
  }, [contacts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-950/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">PLEIA</p>
            <h1 className="text-3xl font-semibold">Newsletter HQ</h1>
            <p className="text-sm text-gray-400">Gestiona contactos, grupos, campañas, workflows y métricas.</p>
          </div>
          <Link
            href="/admin/debug/db"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
          >
            ← Volver al panel clásico
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <section className="space-y-6">
            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <OverviewCard title="Usuarios" value={contactsResponse?.total || '--'} loading={contactsLoading} />
              <OverviewCard title="Grupos" value={groups.length} loading={groupsLoading} />
              <OverviewCard title="Campañas" value={campaigns.length} loading={campaignsLoading} />
              <OverviewCard title="Workflows" value={workflows.length} loading={workflowsLoading} />
            </div>

            {/* Métricas de tracking globales */}
            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-2xl border border-cyan-700/30 p-6">
              <h2 className="text-lg font-semibold text-cyan-300 mb-4">📊 Métricas de Tracking Globales</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-gray-900/60 rounded-lg p-4 border border-cyan-700/20">
                  <p className="text-xs text-gray-400 mb-1">Entregados</p>
                  <p className="text-2xl font-bold text-white">{trackingSummary.delivered}</p>
                </div>
                <div className="bg-cyan-900/30 rounded-lg p-4 border border-cyan-700/30">
                  <p className="text-xs text-cyan-400 mb-1">Abiertos</p>
                  <p className="text-2xl font-bold text-cyan-300">{trackingSummary.opened}</p>
                </div>
                <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/30">
                  <p className="text-xs text-purple-400 mb-1">Clicks</p>
                  <p className="text-2xl font-bold text-purple-300">{trackingSummary.clicked}</p>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-4 border border-cyan-700/20">
                  <p className="text-xs text-gray-400 mb-1">Open Rate</p>
                  <p className={`text-2xl font-bold ${
                    (trackingRates.openRate * 100) > 20 ? 'text-green-400' : 
                    (trackingRates.openRate * 100) > 10 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round((trackingRates.openRate || 0) * 1000) / 10}%
                  </p>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-4 border border-cyan-700/20">
                  <p className="text-xs text-gray-400 mb-1">Click Rate</p>
                  <p className={`text-2xl font-bold ${
                    (trackingRates.clickRate * 100) > 5 ? 'text-green-400' : 
                    (trackingRates.clickRate * 100) > 2 ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {Math.round((trackingRates.clickRate || 0) * 1000) / 10}%
                  </p>
                </div>
              </div>
            </div>

            {/* Distribución de usuarios por plan */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4">👥 Distribución de Usuarios</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(() => {
                  const planCounts = contacts.reduce((acc: any, contact) => {
                    const plan = contact.plan || 'free';
                    acc[plan] = (acc[plan] || 0) + 1;
                    return acc;
                  }, {});
                  return Object.entries(planCounts).map(([plan, count]: [string, any]) => (
                    <div key={plan} className={`rounded-lg p-4 border ${
                      plan === 'founder' ? 'bg-yellow-900/20 border-yellow-700/30' :
                      plan === 'premium' ? 'bg-blue-900/20 border-blue-700/30' :
                      'bg-gray-900 border-gray-800'
                    }`}>
                      <p className="text-xs text-gray-400 mb-1">{plan.toUpperCase()}</p>
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0}%
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Mejores campañas por open rate */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4">🏆 Top Campañas por Open Rate</h2>
              {campaignsLoading ? (
                <p className="text-gray-400 text-sm">Cargando...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-gray-400 text-sm">Aún no hay campañas.</p>
              ) : (
                <div className="space-y-2">
                  {campaigns
                    .filter((c: any) => c.stats && c.stats.sent > 0 && !c.excluded_from_tracking)
                    .sort((a: any, b: any) => {
                      const aRate = a.stats.sent > 0 ? (a.stats.opened / a.stats.sent) : 0;
                      const bRate = b.stats.sent > 0 ? (b.stats.opened / b.stats.sent) : 0;
                      return bRate - aRate;
                    })
                    .slice(0, 5)
                    .map((campaign: any) => {
                      const openRate = campaign.stats.sent > 0 ? (campaign.stats.opened / campaign.stats.sent) * 100 : 0;
                      return (
                        <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{campaign.subject}</p>
                            <p className="text-xs text-gray-400">{campaign.stats.sent} enviados · {campaign.stats.opened} abiertos</p>
                          </div>
                          <div className="ml-4">
                            <p className={`text-lg font-bold ${
                              openRate > 20 ? 'text-green-400' : openRate > 10 ? 'text-yellow-400' : 'text-gray-400'
                            }`}>
                              {openRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  {campaigns.filter((c: any) => c.stats && c.stats.sent > 0).length === 0 && (
                    <p className="text-gray-400 text-sm">No hay campañas enviadas todavía.</p>
                  )}
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Actividad reciente</h2>
              {campaignsLoading ? (
                <p className="text-gray-400 text-sm">Cargando campañas...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-gray-400 text-sm">Aún no hay campañas.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-white/5 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold">{campaign.title}</p>
                        <p className="text-xs text-gray-400">
                          {campaign.status.toUpperCase()} · {new Date(campaign.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="text-xs text-right text-gray-400">
                        <div>Enviados: {campaign.stats?.sent ?? 0}</div>
                        <div>Abiertos: {campaign.stats?.opened ?? 0}</div>
                        <div>Clics: {campaign.stats?.clicked ?? 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Jobs programados</h2>
                <button
                  onClick={handleRunJobs}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs"
                >
                  Ejecutar ahora
                </button>
              </div>
              {jobsLoading ? (
                <p className="text-sm text-gray-400">Cargando jobs…</p>
              ) : pendingJobs.length === 0 ? (
                <p className="text-sm text-gray-400">Sin jobs pendientes.</p>
              ) : (
                <ul className="space-y-3">
                  {pendingJobs.map((job: any, index: number) => (
                    <li key={job.id ?? `job-${index}`} className="border border-white/5 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{job.job_type}</span>
                        <span className="text-xs text-gray-400">
                          {job.scheduled_for ? new Date(job.scheduled_for).toLocaleString('es-ES') : 'sin fecha'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 break-all">
                        Payload: {JSON.stringify(job.payload)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {activeTab === 'contacts' && (
          <section className="space-y-6">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Añadir usuario manual</h2>
              <InfoBadge text="Por defecto tomamos los usuarios reales de Supabase con newsletter/marketing activo. Aquí solo añades excepciones puntuales (QA, invitaciones manuales)." />
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <input
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <select
                  multiple
                  value={contactForm.groupIds}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      groupIds: Array.from(e.target.selectedOptions).map((opt) => opt.value),
                    }))
                  }
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                >
                  {groups.map((group, index) => (
                    <option key={group.id ?? `group-opt-${index}`} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateContact}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
              >
                Añadir contacto
              </button>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Usuarios</h2>
                  <p className="text-xs text-gray-400">
                    {selectedContactsCount} seleccionados · {contactsResponse?.total || '--'} en total
                  </p>
                  <InfoBadge text="Selecciona usuarios (se sincronizan desde Supabase) para acciones masivas, exportaciones o rellenar campañas rápidamente." />
                </div>
                <div className="flex gap-2">
                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar email"
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                  <button onClick={selectAllContacts} className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs">
                    Seleccionar todo
                  </button>
                  <button onClick={clearContactSelection} className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs">
                    Limpiar
                  </button>
                  <button
                    onClick={handleSyncContacts}
                    disabled={syncingContacts}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs"
                  >
                    {syncingContacts ? 'Sincronizando...' : 'Sincronizar usuarios'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={contactFilters.status}
                    onChange={(e) =>
                      setContactFilters((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  >
                    <option value="">Estado</option>
                    <option value="subscribed">Suscritos</option>
                    <option value="unsubscribed">Pausados</option>
                    <option value="bounced">Bounces</option>
                  </select>
                  <select
                    value={contactFilters.plan}
                    onChange={(e) =>
                      setContactFilters((prev) => ({ ...prev, plan: e.target.value }))
                    }
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  >
                    <option value="">Plan</option>
                    <option value="free">Free</option>
                    <option value="founder">Founder</option>
                    <option value="premium">Premium</option>
                  </select>
                  <select
                    value={contactFilters.founder}
                    onChange={(e) =>
                      setContactFilters((prev) => ({ ...prev, founder: e.target.value }))
                    }
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  >
                    <option value="">Founder?</option>
                    <option value="true">Solo founders</option>
                    <option value="false">No founders</option>
                  </select>
                  <select
                    value={contactFilters.groupId}
                    onChange={(e) =>
                      setContactFilters((prev) => ({ ...prev, groupId: e.target.value }))
                    }
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  >
                    <option value="">Grupo</option>
                    {groups.map((group, index) => (
                      <option key={group.id ?? `group-filter-${index}`} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={contactFilters.from}
                    onChange={(e) => setContactFilters((prev) => ({ ...prev, from: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  />
                  <input
                    type="date"
                    value={contactFilters.to}
                    onChange={(e) => setContactFilters((prev) => ({ ...prev, to: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  />
                </div>
              </div>
              {syncMessage && <p className="text-xs text-emerald-300">{syncMessage}</p>}
              {bulkActionMessage && (
                <p className="text-xs text-cyan-300">{bulkActionMessage}</p>
              )}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={bulkGroupId}
                    onChange={(e) => setBulkGroupId(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                  >
                    <option value="">Elegir grupo…</option>
                    {groups.map((group, index) => (
                      <option key={group.id ?? `group-bulk-${index}`} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleBulkGroupAction('add')}
                    disabled={bulkActionLoading}
                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs"
                  >
                    Añadir
                  </button>
                  <button
                    onClick={() => handleBulkGroupAction('remove')}
                    disabled={bulkActionLoading}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white text-xs"
                  >
                    Quitar
                  </button>
                  <button
                    onClick={handleBulkUnsubscribe}
                    disabled={bulkActionLoading}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-xs text-red-200"
                  >
                    Pausar contactos
                  </button>
                  <button
                    onClick={() => handleExportContacts('selection')}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white text-xs"
                  >
                    Export selección
                  </button>
                  <button
                    onClick={() => handleExportContacts('filtered')}
                    className="px-3 py-2 rounded-lg bg-gray-800 text-white text-xs"
                  >
                    Export filtro
                  </button>
                  <button
                    onClick={handleUseSelectionInCampaign}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs"
                  >
                    Usar en campaña
                  </button>
                </div>
                {bulkActionLoading && <span className="text-xs text-gray-400">Procesando acción masiva…</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/5">
                      <th className="py-2 pr-4">Sel.</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Grupos</th>
                      <th className="py-2 pr-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact, index) => (
                      <tr key={contact.id ?? `contact-${contact.email}-${index}`} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-4">
                          <input
                            type="checkbox"
                            className="accent-cyan-500"
                            checked={Boolean(selectedContacts[contact.id])}
                            onChange={() => toggleContactSelection(contact.id)}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <div className="font-semibold">{contact.email}</div>
                          <div className="text-xs text-gray-400 flex flex-wrap gap-2 items-center">
                            <span>{contact.name || '—'}</span>
                            {contact.plan && (
                              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] uppercase tracking-wide">
                                {contact.plan}
                              </span>
                            )}
                            {contact.is_founder && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] uppercase tracking-wide border border-amber-500/30">
                                Founder
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4 capitalize">{contact.status || 'subscribed'}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(contact.groups || []).map((groupId) => {
                              const group = groups.find((g) => g.id === groupId);
                              return (
                                <span key={groupId} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase tracking-wide">
                                  {group?.name || 'Grupo'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={async () => {
                              await fetch(`/api/admin/newsletter/contacts/${contact.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: contact.status === 'subscribed' ? 'unsubscribed' : 'subscribed',
                                }),
                              });
                              mutateContacts();
                            }}
                            className="text-xs text-cyan-400 hover:underline mr-2"
                          >
                            {contact.status === 'subscribed' ? 'Pausar' : 'Reactivar'}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Eliminar ${contact.email}?`)) return;
                              await fetch(`/api/admin/newsletter/contacts/${contact.id}`, { method: 'DELETE' });
                              mutateContacts();
                              mutateGroups();
                            }}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'groups' && (
          <section className="space-y-6">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Crear grupo</h2>
              <InfoBadge text="Agrupa contactos por plan, cohortes o campañas. Después podrás apuntar campañas completas a un grupo o usarlos en workflows." />
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del grupo"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <input
                  value={groupForm.description}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
              </div>
              <button onClick={handleCreateGroup} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium">
                Crear grupo
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {groupsLoading ? (
                <p className="text-gray-400 text-sm">Cargando grupos...</p>
              ) : groups.length === 0 ? (
                <p className="text-gray-400 text-sm">Aún no hay grupos definidos.</p>
              ) : (
                groups.map((group, index) => (
                  <div key={group.id ?? `group-${index}`} className="bg-gray-800 rounded-2xl border border-gray-700 p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                      <p className="text-xs text-gray-400">{group.description || 'Sin descripción'}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>Miembros: {group.member_count ?? 0}</span>
                      <button
                        onClick={() => handleOpenGroup(group.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-900 border border-gray-700 hover:bg-gray-800"
                      >
                        Ver miembros
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const name = prompt('Nuevo nombre', group.name);
                          if (!name) return;
                          await fetch(`/api/admin/newsletter/groups/${group.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name }),
                          });
                          mutateGroups();
                        }}
                        className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs"
                      >
                        Renombrar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Eliminar grupo ${group.name}?`)) return;
                          await fetch(`/api/admin/newsletter/groups/${group.id}`, { method: 'DELETE' });
                          mutateGroups();
                        }}
                        className="px-3 py-1 rounded-lg bg-red-600 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {activeGroupId && (
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Miembros del grupo</h3>
                  <button
                    onClick={() => {
                      setActiveGroupId(null);
                      setGroupMembers([]);
                      setGroupMembersEmail('');
                    }}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input
                    value={groupMembersEmail}
                    onChange={(e) => setGroupMembersEmail(e.target.value)}
                    placeholder="Añadir email al grupo"
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!groupMembersEmail.trim() || !activeGroupId) return;
                      try {
                        const res = await fetch(`/api/admin/newsletter/groups/${activeGroupId}/members`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: groupMembersEmail.trim() }),
                        });
                        const json = await res.json();
                        if (!res.ok || !json.success) {
                          throw new Error(json?.error || 'No se pudo añadir el miembro');
                        }
                        setGroupMembersEmail('');
                        await handleOpenGroup(activeGroupId);
                      } catch (err: any) {
                        console.error('[Newsletter] add member error:', err);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
                  >
                    Añadir
                  </button>
                </div>
                {groupMembersLoading ? (
                  <p className="text-sm text-gray-400">Cargando miembros…</p>
                ) : groupMembers.length === 0 ? (
                  <p className="text-sm text-gray-400">Este grupo aún no tiene contactos asignados.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {groupMembers.map((m, index) => (
                      <li
                        key={m.id ?? (m.email ? `member-${m.email}-${index}` : `member-${index}`)}
                        className="flex items-center justify-between text-sm border border-gray-700 rounded-xl px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-white">{m.email}</p>
                          {(m as any).origin && (
                            <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                              {(m as any).origin}
                            </p>
                          )}
                        </div>
                        {m.id && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/admin/newsletter/groups/${activeGroupId}/members`,
                                  {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contactId: m.id }),
                                  },
                                );
                                const json = await res.json();
                                if (!res.ok || !json.success) {
                                  throw new Error(json?.error || 'No se pudo eliminar el miembro');
                                }
                                await handleOpenGroup(activeGroupId);
                              } catch (err: any) {
                                console.error('[Newsletter] remove member error:', err);
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-200"
                          >
                            Quitar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'campaigns' && (
          <section className="space-y-6">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Nueva campaña</h2>
              <InfoBadge text="Modo rápido usa la plantilla oficial de PLEIA (mismo diseño del correo actual). Solo tienes que definir título, asunto y cuerpo. En modo personalizado puedes ajustar CTAs y estructura." />
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Título interno"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Asunto"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <input
                  value={campaignForm.preheader}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, preheader: e.target.value }))}
                  placeholder="Preheader (opcional)"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm md:col-span-2"
                />
              </div>

              {/* Categoría del mail */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <label className="text-sm font-semibold text-white block mb-3">Categoría del Mail</label>
                <select
                  value={campaignForm.mailCategory}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, mailCategory: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                >
                  <option value="general">General</option>
                  <option value="welcome">Welcome Mail</option>
                  <option value="founder">Founder Mail</option>
                  <option value="update">Actualización</option>
                  <option value="promo">Promoción</option>
                </select>
              </div>

              {/* A/B Testing */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white">🧪 A/B Testing</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campaignForm.abTestEnabled}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, abTestEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                {campaignForm.abTestEnabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-gray-700">
                    <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-3 text-xs text-cyan-200">
                      <strong>¿Cómo funciona?</strong><br />
                      • 25% recibe Asunto A, 25% recibe Asunto B<br />
                      • Se evalúa automáticamente a las 20:00h (España) del día que corresponda<br />
                      • El 50% restante recibe el mail con el asunto ganador
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Asunto B (variante)</label>
                      <input
                        value={campaignForm.subjectB}
                        onChange={(e) => setCampaignForm((prev) => ({ ...prev, subjectB: e.target.value }))}
                        placeholder="Asunto alternativo para probar"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">⏳ Días de espera antes de evaluar</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={campaignForm.testDurationUnit === 'hours' ? Math.ceil(campaignForm.testDuration / 24) : campaignForm.testDuration}
                            onChange={(e) => setCampaignForm((prev) => ({ 
                              ...prev, 
                              testDuration: parseInt(e.target.value) || 1,
                              testDurationUnit: 'days'
                            }))}
                            className="w-20 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-center"
                          />
                          <span className="text-sm text-gray-400">día(s)</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Se evaluará a las 20:00 UTC tras {campaignForm.testDurationUnit === 'hours' ? Math.ceil(campaignForm.testDuration / 24) : campaignForm.testDuration} día(s)
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Criterio ganador</label>
                        <select
                          value={campaignForm.winnerCriteria}
                          onChange={(e) => setCampaignForm((prev) => ({ ...prev, winnerCriteria: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                        >
                          <option value="opens">🔓 Más aperturas</option>
                          <option value="clicks">👆 Más clicks</option>
                          <option value="ctr">📊 Mejor CTR (clicks/aperturas)</option>
                          <option value="combined">🎯 Combinado (clicks + aperturas)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 text-xs">
                      <p className="text-yellow-300 font-medium">⏰ Sistema de cron diario</p>
                      <p className="text-yellow-200/70 mt-1">
                        El cron se ejecuta <strong>1 vez al día a las 20:00h (España)</strong>. 
                        Si configuras {campaignForm.testDurationUnit === 'hours' ? Math.ceil(campaignForm.testDuration / 24) : campaignForm.testDuration} día(s), 
                        la evaluación se hará a las 20:00h del día {campaignForm.testDurationUnit === 'hours' ? Math.ceil(campaignForm.testDuration / 24) : campaignForm.testDuration} después del envío.
                      </p>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="text-xs text-gray-400">Distribución:</div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-cyan-600/20 border border-cyan-600/40 rounded p-2 text-center">
                          <div className="text-cyan-300 font-bold">25%</div>
                          <div className="text-gray-400">Asunto A</div>
                        </div>
                        <div className="bg-purple-600/20 border border-purple-600/40 rounded p-2 text-center">
                          <div className="text-purple-300 font-bold">25%</div>
                          <div className="text-gray-400">Asunto B</div>
                        </div>
                        <div className="bg-green-600/20 border border-green-600/40 rounded p-2 text-center">
                          <div className="text-green-300 font-bold">50%</div>
                          <div className="text-gray-400">Ganador</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={campaignForm.body}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Cuerpo (markdown básico o texto plano)"
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
              />
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Modo</label>
                  <select
                    value={campaignForm.templateMode}
                    onChange={(e) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        templateMode: e.target.value as 'custom' | 'pleia' | 'minimal',
                        primaryLabel:
                          e.target.value === 'pleia' ? 'Crear playlist con IA' : 
                          e.target.value === 'minimal' ? 'Continuar leyendo' : 
                          prev.primaryLabel,
                        primaryUrl:
                          e.target.value === 'pleia' ? 'https://playlists.jeylabbb.com' : 
                          e.target.value === 'minimal' ? 'https://playlists.jeylabbb.com' : 
                          prev.primaryUrl,
                        secondaryLabel:
                          e.target.value === 'pleia' ? 'Explorar trending' : 
                          e.target.value === 'minimal' ? '' : 
                          prev.secondaryLabel,
                        secondaryUrl:
                          e.target.value === 'pleia' ? 'https://playlists.jeylabbb.com/trending' : 
                          e.target.value === 'minimal' ? '' : 
                          prev.secondaryUrl,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  >
                    <option value="custom">Personalizado</option>
                    <option value="pleia">🎨 Plantilla PLEIA (Visual)</option>
                    <option value="minimal">📄 Plantilla Minimal (Texto)</option>
                  </select>
                </div>
                <div className="md:col-span-2 text-xs text-gray-400">
                  {campaignForm.templateMode === 'pleia'
                    ? '🎨 Plantilla visual con colores y gradientes PLEIA. CTAs se fijan automáticamente.'
                    : campaignForm.templateMode === 'minimal'
                    ? '📄 Plantilla minimalista enfocada en legibilidad del texto. Un solo CTA principal.'
                    : 'Puedes personalizar botones y enlaces.'}
                </div>
              </div>
              {(campaignForm.templateMode === 'custom' || campaignForm.templateMode === 'minimal') && (
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={campaignForm.primaryLabel}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, primaryLabel: e.target.value }))}
                    placeholder="Label CTA principal"
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                  <input
                    value={campaignForm.primaryUrl}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, primaryUrl: e.target.value }))}
                    placeholder="URL CTA principal"
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                  <input
                    value={campaignForm.secondaryLabel}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, secondaryLabel: e.target.value }))}
                    placeholder="Label CTA secundaria"
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                  <input
                    value={campaignForm.secondaryUrl}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, secondaryUrl: e.target.value }))}
                    placeholder="URL CTA secundaria"
                    className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  />
                </div>
              )}
              {/* Selector mejorado de destinatarios */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-white">Destinatarios</label>
                  <div className="text-xs text-cyan-400">
                    {(() => {
                      const groupCount = campaignForm.groupIds.length;
                      const userCount = campaignForm.selectedUserEmails.length;
                      const manualCount = campaignForm.recipientEmails ? campaignForm.recipientEmails.split(',').filter(Boolean).length : 0;
                      const totalEstimate = groups
                        .filter(g => campaignForm.groupIds.includes(g.id))
                        .reduce((sum, g) => sum + (g.member_count ?? 0), 0) + userCount + manualCount;
                      return `~${totalEstimate} destinatarios`;
                    })()}
                  </div>
                </div>

                {/* Tabs de modo */}
                <div className="flex gap-2 mb-4 bg-gray-900 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('groups')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      recipientMode === 'groups'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    📁 Grupos ({campaignForm.groupIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('users')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      recipientMode === 'users'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    👥 Usuarios ({campaignForm.selectedUserEmails.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('manual')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      recipientMode === 'manual'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    ✍️ Manual
                  </button>
                </div>

                {/* Búsqueda (solo para groups y users) */}
                {(recipientMode === 'groups' || recipientMode === 'users') && (
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder={recipientMode === 'groups' ? 'Buscar grupos...' : 'Buscar usuarios...'}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm mb-3"
                  />
                )}

                {/* Contenido según modo */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {recipientMode === 'groups' && (
                    <>
                      {groups
                        .filter(group => 
                          !recipientSearch || 
                          group.name.toLowerCase().includes(recipientSearch.toLowerCase())
                        )
                        .map((group, index) => (
                          <label
                            key={group.id ?? `campaign-group-${index}`}
                            className="flex items-center gap-3 p-3 rounded-lg bg-gray-900 hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={campaignForm.groupIds.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCampaignForm(prev => ({
                                    ...prev,
                                    groupIds: [...prev.groupIds, group.id]
                                  }));
                                } else {
                                  setCampaignForm(prev => ({
                                    ...prev,
                                    groupIds: prev.groupIds.filter(id => id !== group.id)
                                  }));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-900"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-white font-medium">{group.name}</div>
                              <div className="text-xs text-gray-400">
                                {group.member_count ?? 0} miembros
                                {group.description && ` · ${group.description}`}
                              </div>
                            </div>
                          </label>
                        ))}
                    </>
                  )}

                  {recipientMode === 'users' && (
                    <>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const filteredEmails = contacts
                              .filter(c => 
                                !recipientSearch || 
                                c.email.toLowerCase().includes(recipientSearch.toLowerCase())
                              )
                              .map(c => c.email);
                            setCampaignForm(prev => ({
                              ...prev,
                              selectedUserEmails: Array.from(new Set([...prev.selectedUserEmails, ...filteredEmails]))
                            }));
                          }}
                          className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700"
                        >
                          Seleccionar {recipientSearch ? 'filtrados' : 'todos'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCampaignForm(prev => ({ ...prev, selectedUserEmails: [] }))}
                          className="text-xs px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                          Limpiar
                        </button>
                      </div>
                      {contacts
                        .filter(contact => 
                          !recipientSearch || 
                          contact.email.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          contact.name?.toLowerCase().includes(recipientSearch.toLowerCase())
                        )
                        .map((contact) => (
                          <label
                            key={contact.id ?? contact.email}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={campaignForm.selectedUserEmails.includes(contact.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCampaignForm(prev => ({
                                    ...prev,
                                    selectedUserEmails: [...prev.selectedUserEmails, contact.email]
                                  }));
                                } else {
                                  setCampaignForm(prev => ({
                                    ...prev,
                                    selectedUserEmails: prev.selectedUserEmails.filter(email => email !== contact.email)
                                  }));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-900"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{contact.email}</div>
                              {contact.name && (
                                <div className="text-xs text-gray-400">{contact.name}</div>
                              )}
                            </div>
                            {contact.plan && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                contact.plan === 'founder' ? 'bg-yellow-600/20 text-yellow-300' :
                                contact.plan === 'premium' ? 'bg-blue-600/20 text-blue-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {contact.plan}
                              </span>
                            )}
                          </label>
                        ))}
                    </>
                  )}

                  {recipientMode === 'manual' && (
                    <div>
                      <textarea
                        value={campaignForm.recipientEmails}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, recipientEmails: e.target.value }))}
                        rows={6}
                        placeholder="Introduce emails separados por comas:&#10;usuario1@ejemplo.com, usuario2@ejemplo.com"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {campaignForm.recipientEmails ? 
                          `${campaignForm.recipientEmails.split(',').filter(Boolean).length} emails` : 
                          'Separa múltiples emails con comas'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags de selección */}
                {(campaignForm.groupIds.length > 0 || campaignForm.selectedUserEmails.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Seleccionados:</div>
                    <div className="flex flex-wrap gap-2">
                      {campaignForm.groupIds.map(groupId => {
                        const group = groups.find(g => g.id === groupId);
                        return group ? (
                          <span
                            key={groupId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-600/20 text-cyan-300 rounded-md text-xs"
                          >
                            📁 {group.name} ({group.member_count ?? 0})
                            <button
                              type="button"
                              onClick={() => setCampaignForm(prev => ({
                                ...prev,
                                groupIds: prev.groupIds.filter(id => id !== groupId)
                              }))}
                              className="ml-1 hover:text-cyan-100"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                      {campaignForm.selectedUserEmails.slice(0, 10).map(email => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-300 rounded-md text-xs"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => setCampaignForm(prev => ({
                              ...prev,
                              selectedUserEmails: prev.selectedUserEmails.filter(e => e !== email)
                            }))}
                            className="ml-1 hover:text-blue-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {campaignForm.selectedUserEmails.length > 10 && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs">
                          +{campaignForm.selectedUserEmails.length - 10} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Modo de envío</label>
                  <select
                    value={campaignForm.sendMode}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, sendMode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                  >
                    <option value="draft">Borrador</option>
                    <option value="immediate">Enviar ahora</option>
                    <option value="scheduled">Programar</option>
                  </select>
                </div>
                {campaignForm.sendMode === 'scheduled' && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-400 block mb-1">📅 Fecha de envío (se enviará a las 20:00 UTC)</label>
                    <input
                      type="date"
                      value={campaignForm.scheduledFor.split('T')[0] || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        // Establecer siempre a las 20:00 UTC del día seleccionado
                        const selectedDate = e.target.value;
                        if (selectedDate) {
                          setCampaignForm((prev) => ({ 
                            ...prev, 
                            scheduledFor: `${selectedDate}T20:00:00.000Z`
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                    />
                    <div className="bg-blue-900/30 border border-blue-700/30 rounded-lg p-3 text-xs">
                      <p className="text-blue-300 font-medium mb-1">⏰ Sistema de envío programado</p>
                      <p className="text-blue-200/80">
                        El cron procesa los envíos <strong>una vez al día a las 20:00 hora España</strong>.
                      </p>
                      <p className="text-blue-200/60 mt-1">
                        Tu campaña se enviará el <strong>{campaignForm.scheduledFor ? 
                          new Date(campaignForm.scheduledFor).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          }) : 'día seleccionado'}</strong> a las 20:00h.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Test Email */}
                <div className="flex-1 bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <label className="text-xs text-gray-400 block mb-2">📧 Enviar email de prueba</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                    />
                    <button
                      disabled={sendingTestEmail || !campaignForm.subject || !campaignForm.body}
                      onClick={() => handleSendTestEmail()}
                      className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {sendingTestEmail ? 'Enviando...' : 'Enviar test'}
                    </button>
                  </div>
                  {testEmailMessage && (
                    <p className={`text-xs mt-2 ${testEmailMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                      {testEmailMessage}
                    </p>
                  )}
                </div>
                
                <button
                  disabled={campaignSending}
                  onClick={handleCreateCampaign}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 self-end"
                >
                  {campaignSending ? 'Enviando...' : 'Guardar campaña'}
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Historial de campañas</h2>
              {campaignsLoading ? (
                <p className="text-gray-400 text-sm">Cargando campañas...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-gray-400 text-sm">Aún no se han creado campañas.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign, index) => (
                    <div key={campaign.id ?? `campaign-${index}`} className="border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-semibold">{campaign.title}</p>
                          <p className="text-xs text-gray-400">{campaign.subject}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 uppercase tracking-wide">
                          {campaign.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex gap-4">
                        <span>Sent: {campaign.stats?.sent ?? 0}</span>
                        <span>Opens: {campaign.stats?.opened ?? 0}</span>
                        <span>Clicks: {campaign.stats?.clicked ?? 0}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <button
                          onClick={() => openCampaignDetail(campaign.id)}
                          className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs hover:bg-gray-800"
                        >
                          Ver detalle
                        </button>
                        <button
                          disabled={sendingTestEmail}
                          onClick={() => handleSendTestEmail(campaign)}
                          className="px-3 py-1 rounded-lg bg-purple-600/20 border border-purple-600/40 text-purple-300 text-xs hover:bg-purple-600/30 disabled:opacity-50"
                        >
                          📧 Test
                        </button>
                        <button
                          onClick={async () => {
                            const currentTitle = campaign.title || '';
                            const currentSubject = campaign.subject || '';
                            const nextTitle = window.prompt('Nuevo título interno de la campaña', currentTitle)?.trim();
                            if (!nextTitle) return;
                            const nextSubject =
                              window.prompt('Nuevo asunto (opcional, deja vacío para mantener el actual)', currentSubject)?.trim() ||
                              currentSubject;
                            await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ title: nextTitle, subject: nextSubject }),
                            });
                            mutateCampaigns();
                          }}
                          className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs hover:bg-gray-800"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`¿Estás seguro de eliminar la campaña "${campaign.title}"?\n\nEsta acción no se puede deshacer. La campaña se eliminará de:\n• Historial de campañas\n• Tracking\n• Todos los reportes\n\nLos datos de envío y eventos también se eliminarán.`)) {
                              return;
                            }
                            try {
                              const response = await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`, {
                                method: 'DELETE',
                              });
                              const result = await response.json();
                              if (result.success) {
                                alert('✅ Campaña eliminada correctamente');
                                mutateCampaigns();
                              } else {
                                alert(`❌ Error: ${result.error || 'No se pudo eliminar la campaña'}`);
                              }
                            } catch (error: any) {
                              alert(`❌ Error: ${error.message || 'No se pudo eliminar la campaña'}`);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-red-600/20 border border-red-600/40 text-red-300 text-xs hover:bg-red-600/30"
                        >
                          🗑️ Eliminar
                        </button>
                        {campaign.status === 'scheduled' && (
                          <span className="text-xs text-gray-500">
                            Programado para {campaign.scheduled_for ? new Date(campaign.scheduled_for).toLocaleString('es-ES') : '—'}
                          </span>
                        )}
                      </div>
                <div className="flex items-center gap-2">
                  <input
                    id="trackingEnabled"
                    type="checkbox"
                    checked={campaignForm.trackingEnabled}
                    onChange={(e) =>
                      setCampaignForm((prev) => ({ ...prev, trackingEnabled: e.target.checked }))
                    }
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <label htmlFor="trackingEnabled" className="text-xs text-gray-300">
                    Activar tracking (aperturas y clics)
                  </label>
                </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>
        )}

        {activeTab === 'templates' && (
          <section className="space-y-6">
            <div className="bg-[#0b111f] rounded-3xl border border-white/5 p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Biblioteca de plantillas</h2>
                  <p className="text-sm text-gray-400">
                    Estructuras reutilizables con el diseño oficial de PLEIA. Úsalas para acelerar campañas.
                  </p>
                </div>
                <button
                  onClick={handleSaveTemplate}
                  disabled={templateSaving}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {templateSaving ? 'Guardando...' : 'Guardar plantilla actual'}
                </button>
              </div>
              {templateActionMessage && (
                <p className="text-xs text-cyan-300">{templateActionMessage}</p>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre interno"
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
                <input
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción (opcional)"
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
                <label className="flex items-center gap-2 text-xs text-gray-300 col-span-full">
                  <input
                    type="checkbox"
                    checked={templateForm.isDefault}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                    }
                    className="accent-cyan-500"
                  />
                  Marcar como plantilla por defecto (se sugiere al crear campañas).
                </label>
              </div>
            </div>

            <div className="bg-[#0b111f] rounded-3xl border border-white/5 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">🎨 Plantillas predefinidas</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* PLEIA Visual Template */}
                <div className="rounded-2xl border border-cyan-500/30 p-4 space-y-3 bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">🎨 PLEIA Visual</p>
                      <p className="text-xs text-gray-400">Plantilla mítica con gradientes y colores PLEIA.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                      Oficial
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setCampaignForm(prev => ({ ...prev, templateMode: 'pleia' }));
                        setTemplateActionMessage('✅ Plantilla PLEIA Visual seleccionada');
                        setTimeout(() => setActiveTab('campaigns'), 400);
                      }}
                      className="px-3 py-1 rounded-full bg-cyan-600/20 text-xs text-cyan-200 hover:bg-cyan-600/30 border border-cyan-500/40"
                    >
                      Usar en campaña
                    </button>
                  </div>
                </div>

                {/* Minimal Template */}
                <div className="rounded-2xl border border-gray-500/30 p-4 space-y-3 bg-gradient-to-br from-gray-900/20 to-gray-800/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">📄 PLEIA Minimal</p>
                      <p className="text-xs text-gray-400">Minimalista enfocada en legibilidad del texto.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-gray-500/20 text-gray-300 border border-gray-500/40">
                      Oficial
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setCampaignForm(prev => ({ ...prev, templateMode: 'minimal' }));
                        setTemplateActionMessage('✅ Plantilla PLEIA Minimal seleccionada');
                        setTimeout(() => setActiveTab('campaigns'), 400);
                      }}
                      className="px-3 py-1 rounded-full bg-gray-600/20 text-xs text-gray-200 hover:bg-gray-600/30 border border-gray-500/40"
                    >
                      Usar en campaña
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-white mb-4 pt-4 border-t border-white/10">📚 Plantillas personalizadas</h3>
              {templatesLoading ? (
                <p className="text-sm text-gray-400">Cargando plantillas...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-400">Aún no tienes plantillas guardadas.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {templates.map((template: any, index: number) => (
                    <div key={template.id ?? `template-${index}`} className="rounded-2xl border border-white/10 p-4 space-y-3 bg-[#111a2f]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{template.name}</p>
                          <p className="text-xs text-gray-400">{template.description || 'Sin descripción'}</p>
                        </div>
                        {template.is_default && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                            Default
                          </span>
                        )}
                      </div>
                      {template.subject && (
                        <p className="text-xs text-gray-500">Asunto sugerido: {template.subject}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApplyTemplate(template)}
                          className="px-3 py-1 rounded-full bg-white/10 text-xs text-white hover:bg-white/20"
                        >
                          Aplicar a campaña
                        </button>
                        <button
                          onClick={() => handleUpdateTemplate(template.id, { isDefault: true })}
                          className="px-3 py-1 rounded-full bg-transparent border border-white/20 text-xs text-white hover:border-white/40"
                        >
                          Fijar default
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-xs text-red-200"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'saved' && (
          <section className="space-y-6">
            <div className="bg-[#0b111f] rounded-3xl border border-white/5 p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Mails guardados</h2>
                  <p className="text-sm text-gray-400">
                    Bienvenidas, follow-ups, recordatorios... Guárdalos aquí y reutílizalos desde workflows o campañas.
                  </p>
                </div>
                <button
                  onClick={handleSaveMail}
                  disabled={savedMailSaving}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savedMailSaving ? 'Guardando...' : 'Guardar mail'}
                </button>
              </div>
              {savedMailMessage && <p className="text-xs text-emerald-300">{savedMailMessage}</p>}
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={savedMailForm.name}
                  onChange={(e) => setSavedMailForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre interno"
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
                <input
                  value={savedMailForm.description}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción"
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
                <input
                  value={savedMailForm.subject}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Asunto (opcional)"
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
                <select
                  value={savedMailForm.category}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                >
                  <option value="welcome">Welcome</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="promo">Promo</option>
                  <option value="general">General</option>
                </select>
                <select
                  value={savedMailForm.status}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
                <select
                  value={savedMailForm.templateId}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({
                      ...prev,
                      templateId: e.target.value,
                      templateMode: e.target.value === '__pleia__' ? 'pleia' : 'custom',
                    }))
                  }
                  className="px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                >
                  <option value="">Sin plantilla</option>
                  <option value="__pleia__">Plantilla PLEIA (oficial)</option>
                  {templates.map((template: any, idx: number) => (
                    <option key={template.id ?? `saved-mail-template-${idx}`} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={savedMailForm.body}
                  onChange={(e) =>
                    setSavedMailForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder="Contenido (HTML o texto enriquecido)"
                  rows={6}
                  className="md:col-span-2 px-3 py-2 rounded-2xl bg-[#0f172a] border border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <div className="bg-[#0b111f] rounded-3xl border border-white/5 p-6 space-y-4">
              {savedMailsLoading ? (
                <p className="text-sm text-gray-400">Cargando mails guardados...</p>
              ) : savedMails.length === 0 ? (
                <p className="text-sm text-gray-400">Cuando guardes un mail aparecerá aquí.</p>
              ) : (
                <div className="space-y-4">
                  {savedMails.map((mail: any, index: number) => (
                    <div key={mail.id ?? `saved-mail-${index}`} className="rounded-2xl border border-white/10 p-4 bg-[#121b31] space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{mail.name}</p>
                          <p className="text-xs text-gray-400">{mail.description || 'Sin descripción'}</p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] uppercase rounded-full bg-white/10 text-gray-200">
                          {mail.category}
                        </span>
                      </div>
                      {mail.subject && <p className="text-xs text-gray-500">Asunto: {mail.subject}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApplySavedMail(mail)}
                          className="px-3 py-1 rounded-full bg-white/10 text-xs text-white hover:bg-white/20"
                        >
                          Componer campaña
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateSavedMail(mail.id, {
                              status: mail.status === 'published' ? 'draft' : 'published',
                            })
                          }
                          className="px-3 py-1 rounded-full bg-transparent border border-white/20 text-xs text-white hover:border-white/40"
                        >
                          {mail.status === 'published' ? 'Despublicar' : 'Publicar'}
                        </button>
                        <button
                          onClick={() => handleDeleteSavedMail(mail.id)}
                          className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-xs text-red-200"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'workflows' && (
          <section className="space-y-6">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Nuevo workflow</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del workflow"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <input
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción"
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                />
                <select
                  value={workflowForm.trigger_type}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, trigger_type: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="contact_added">Nuevo contacto</option>
                  <option value="group_joined">Entrada a grupo</option>
                  <option value="pleia_account_created">Alta cuenta PLEIA</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={workflowForm.is_active}
                    onChange={(e) => setWorkflowForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="accent-cyan-500"
                  />
                  Activo
                </label>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs" onClick={() => addWorkflowStep('wait')}>
                    + Espera
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs" onClick={() => addWorkflowStep('send_campaign')}>
                    + Enviar campaña
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs" onClick={() => addWorkflowStep('send_saved_mail')}>
                    + Mail guardado
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs" onClick={() => addWorkflowStep('add_to_group')}>
                    + Añadir a grupo
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs" onClick={() => addWorkflowStep('remove_from_group')}>
                    + Quitar de grupo
                  </button>
                </div>
                {workflowForm.steps.length === 0 ? (
                  <p className="text-sm text-gray-400">Añade pasos para construir el workflow.</p>
                ) : (
                  <div className="space-y-3">
                    {workflowForm.steps.map((step, index) => (
                      <div key={index} className="border border-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>
                            Paso {index + 1}: {step.action_type}
                          </span>
                          <button
                            onClick={() => removeWorkflowStep(index)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                        {step.action_type === 'wait' && (
                          <div className="grid md:grid-cols-2 gap-3">
                            <input
                              type="number"
                              min={1}
                              value={step.action_config.minutes || ''}
                              onChange={(e) =>
                                updateWorkflowStep(index, { minutes: Number(e.target.value) || 0 })
                              }
                              placeholder="Minutos a esperar"
                              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                            />
                          </div>
                        )}
                        {step.action_type === 'send_campaign' && (
                          <select
                            value={step.action_config.campaign_id || ''}
                            onChange={(e) => updateWorkflowStep(index, { campaign_id: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                          >
                            <option value="">Selecciona campaña</option>
                            {campaigns.map((campaign, idx) => (
                              <option key={campaign.id ?? `workflow-campaign-${idx}`} value={campaign.id}>
                                {campaign.title}
                              </option>
                            ))}
                          </select>
                        )}
                        {step.action_type === 'add_to_group' && (
                          <select
                            value={step.action_config.group_id || ''}
                            onChange={(e) => updateWorkflowStep(index, { group_id: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                          >
                            <option value="">Selecciona grupo</option>
                            {groups.map((group, idx) => (
                              <option key={group.id ?? `workflow-add-group-${idx}`} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {step.action_type === 'remove_from_group' && (
                          <select
                            value={step.action_config.group_id || ''}
                            onChange={(e) => updateWorkflowStep(index, { group_id: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                          >
                            <option value="">Selecciona grupo</option>
                            {groups.map((group, idx) => (
                              <option key={group.id ?? `workflow-remove-group-${idx}`} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {step.action_type === 'send_saved_mail' && (
                          <select
                            value={step.action_config.mail_id || ''}
                            onChange={(e) => updateWorkflowStep(index, { mail_id: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
                          >
                            <option value="">Selecciona mail guardado</option>
                            {savedMails.map((mail: any, idx: number) => (
                              <option key={mail.id ?? `workflow-mail-${idx}`} value={mail.id}>
                                {mail.name} ({mail.category})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500"
              >
                Guardar workflow
              </button>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Workflows existentes</h2>
              {workflowsLoading ? (
                <p className="text-gray-400 text-sm">Cargando workflows...</p>
              ) : workflows.length === 0 ? (
                <p className="text-gray-400 text-sm">Todavía no tienes workflows configurados.</p>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow, index) => (
                    <div key={workflow.id ?? `workflow-${index}`} className="border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{workflow.name}</p>
                          <p className="text-xs text-gray-400">{workflow.description || 'Sin descripción'}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            workflow.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {workflow.is_active ? 'ACTIVO' : 'PAUSADO'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Trigger: {workflow.trigger_type} · {workflow.steps.length} pasos
                      </div>
                      <div className="flex gap-3 flex-wrap items-center text-xs">
                        <button
                          onClick={() => setWorkflowDetailId(workflow.id)}
                          className="text-cyan-300 hover:underline"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={async () => {
                            const currentName = workflow.name || '';
                            const nextName = window.prompt('Nuevo nombre del workflow', currentName)?.trim();
                            if (!nextName) return;
                            await fetch(`/api/admin/newsletter/workflows/${workflow.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: nextName }),
                            });
                            mutateWorkflows();
                          }}
                          className="text-cyan-300 hover:underline"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/newsletter/workflows/${workflow.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ is_active: !workflow.is_active }),
                            });
                            mutateWorkflows();
                          }}
                          className="text-cyan-400 hover:underline"
                        >
                          {workflow.is_active ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Eliminar workflow ${workflow.name}?`)) return;
                            await fetch(`/api/admin/newsletter/workflows/${workflow.id}`, { method: 'DELETE' });
                            mutateWorkflows();
                          }}
                          className="text-red-400 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'tracking' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <OverviewCard title="Entregados" value={trackingSummary.delivered} loading={analyticsLoading} />
              <OverviewCard title="Abiertos" value={trackingSummary.opened} loading={analyticsLoading} />
              <OverviewCard title="Clics" value={trackingSummary.clicked} loading={analyticsLoading} />
              <OverviewCard
                title="Open rate"
                value={`${Math.round((trackingRates.openRate || 0) * 1000) / 10}%`}
                loading={analyticsLoading}
              />
              <OverviewCard
                title="Click rate"
                value={`${Math.round((trackingRates.clickRate || 0) * 1000) / 10}%`}
                loading={analyticsLoading}
              />
            </div>

            {/* Métricas por categoría de mail */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-6">📊 Métricas por Tipo de Mail</h2>
              {campaignsLoading ? (
                <p className="text-gray-400 text-sm">Cargando métricas...</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Separar campañas incluidas y excluidas
                    const includedCampaigns = campaigns.filter((c: any) => !c.excluded_from_tracking);
                    const excludedCampaigns = campaigns.filter((c: any) => c.excluded_from_tracking);
                    
                    // Agrupar por categoría (solo incluidas para el cálculo de métricas)
                    const categoryGroups = campaigns.reduce((acc: any, campaign: any) => {
                      const category = campaign.mail_category || 'general';
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      acc[category].push(campaign);
                      return acc;
                    }, {});

                    const categoryLabels: Record<string, string> = {
                      welcome: '👋 Welcome Mails',
                      founder: '⭐ Founder Mails',
                      update: '📰 Actualizaciones',
                      promo: '🎁 Promociones',
                      general: '📧 General',
                    };

                    return Object.entries(categoryGroups).map(([category, categoryCampaigns]: [string, any]) => {
                      // Solo contar campañas INCLUIDAS para las métricas de categoría
                      const includedInCategory = categoryCampaigns.filter((c: any) => !c.excluded_from_tracking);
                      const excludedInCategory = categoryCampaigns.filter((c: any) => c.excluded_from_tracking);
                      
                      const categoryStats = includedInCategory.reduce((acc: any, c: any) => {
                        const stats = c.stats || { sent: 0, opened: 0, clicked: 0 };
                        return {
                          sent: acc.sent + stats.sent,
                          opened: acc.opened + stats.opened,
                          clicked: acc.clicked + stats.clicked,
                          total: acc.total + 1,
                        };
                      }, { sent: 0, opened: 0, clicked: 0, total: 0 });

                      const openRate = categoryStats.sent > 0 ? (categoryStats.opened / categoryStats.sent) * 100 : 0;
                      const clickRate = categoryStats.opened > 0 ? (categoryStats.clicked / categoryStats.opened) * 100 : 0;

                      return (
                        <details key={category} className="bg-gray-900 rounded-lg border border-gray-700" open>
                          <summary className="cursor-pointer p-4 hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  {categoryLabels[category] || category}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {categoryStats.total} campañas incluidas
                                  {excludedInCategory.length > 0 && (
                                    <span className="text-gray-500 ml-1">
                                      ({excludedInCategory.length} excluidas)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-4 text-xs">
                                <div className="text-center">
                                  <div className="text-cyan-400 font-bold">{openRate.toFixed(1)}%</div>
                                  <div className="text-gray-500">Apertura</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-purple-400 font-bold">{clickRate.toFixed(1)}%</div>
                                  <div className="text-gray-500">Click</div>
                                </div>
                              </div>
                            </div>
                          </summary>
                          <div className="p-4 pt-0 space-y-3">
                            {categoryCampaigns.map((campaign: any) => {
                              const stats = campaign.stats || { sent: 0, opened: 0, clicked: 0 };
                              const cOpenRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
                              const cClickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;

                              const isExcluded = campaign.excluded_from_tracking;

                              return (
                                <div 
                                  key={campaign.id} 
                                  className={`bg-gray-800 rounded-lg p-4 transition-all duration-300 ${
                                    isExcluded 
                                      ? 'opacity-40 hover:opacity-60' 
                                      : 'hover:bg-gray-700/50'
                                  }`}
                                >
                                  {/* Vista resumida para excluidos */}
                                  {isExcluded ? (
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <div className="text-sm font-medium text-gray-400 truncate line-through">{campaign.subject}</div>
                                        <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-500 rounded whitespace-nowrap">
                                          Excluido
                                        </span>
                                      </div>
                                      <button
                                        onClick={async () => {
                                          await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ excluded_from_tracking: false }),
                                          });
                                          mutateCampaigns();
                                          mutateAnalytics();
                                        }}
                                        className="px-3 py-1 text-xs rounded bg-green-600/20 text-green-300 hover:bg-green-600/30 whitespace-nowrap ml-2"
                                      >
                                        ✓ Incluir
                                      </button>
                                    </div>
                                  ) : (
                                    /* Vista detallada para incluidos */
                                    <>
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="text-sm font-medium text-white truncate">{campaign.subject}</div>
                                          </div>
                                          {campaign.ab_test_enabled && (
                                            <div className="flex gap-2 mt-1">
                                              <span className="text-xs px-2 py-0.5 bg-cyan-600/20 text-cyan-300 rounded">
                                                🧪 A/B Test
                                              </span>
                                              {campaign.ab_test_winner && (
                                                <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-300 rounded">
                                                  Ganador: {campaign.ab_test_winner}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{campaign.body?.substring(0, 100)}...</div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <button
                                            onClick={() => setMailDetailId(campaign.id)}
                                            className="px-2 py-1 text-xs bg-cyan-600/20 text-cyan-300 rounded hover:bg-cyan-600/30"
                                          >
                                            Ver detalle
                                          </button>
                                          <button
                                            onClick={async () => {
                                              await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ excluded_from_tracking: true }),
                                              });
                                              mutateCampaigns();
                                              mutateAnalytics();
                                            }}
                                            className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-300 hover:bg-red-600/30"
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      </div>
                                  
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                        <div className="text-center p-2 bg-gray-900 rounded">
                                          <div className="text-gray-400">Enviados</div>
                                          <div className="text-white font-bold">{stats.sent}</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-900 rounded">
                                          <div className="text-gray-400">Abiertos</div>
                                          <div className="text-cyan-400 font-bold">{stats.opened}</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-900 rounded">
                                          <div className="text-gray-400">Clicks</div>
                                          <div className="text-purple-400 font-bold">{stats.clicked}</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-900 rounded">
                                          <div className="text-gray-400">Open Rate</div>
                                          <div className={`font-bold ${cOpenRate > 20 ? 'text-green-400' : cOpenRate > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {cOpenRate.toFixed(1)}%
                                          </div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-900 rounded">
                                          <div className="text-gray-400">CTR</div>
                                          <div className={`font-bold ${cClickRate > 5 ? 'text-green-400' : cClickRate > 2 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                            {cClickRate.toFixed(1)}%
                                          </div>
                                        </div>
                                      </div>
                                  
                                      {campaign.ab_test_enabled && campaign.ab_test_evaluated_at && (
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                          <div className="text-xs text-gray-400 mb-2">Resultados A/B Test:</div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 bg-cyan-900/20 border border-cyan-700/30 rounded">
                                              <div className="text-cyan-300 font-medium">Variante A</div>
                                              <div className="text-gray-400">{campaign.subject}</div>
                                            </div>
                                            <div className="p-2 bg-purple-900/20 border border-purple-700/30 rounded">
                                              <div className="text-purple-300 font-medium">Variante B</div>
                                              <div className="text-gray-400">{campaign.subject_b}</div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      {campaignDetail && (
        <CampaignDetailDrawer
          campaign={campaignDetail}
          loading={campaignRecipientsLoading}
          recipients={campaignRecipients}
          onClose={closeCampaignDetail}
        />
      )}
      {workflowDetail && (
        <WorkflowDetailDrawer
          workflow={workflowDetail}
          onClose={() => setWorkflowDetailId(null)}
        />
      )}
      {mailDetailId && (
        <MailDetailModal
          campaignId={mailDetailId}
          onClose={() => setMailDetailId(null)}
        />
      )}
    </div>
  );
}

function WorkflowDetailDrawer({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const sortedSteps = (workflow.steps || [])
    .slice()
    .sort((a: any, b: any) => a.step_order - b.step_order);

  const stepTypes = sortedSteps.reduce<Record<string, number>>((acc, step: any) => {
    acc[step.action_type] = (acc[step.action_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-3xl w-full mx-4 bg-gray-950 border border-gray-800 rounded-3xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Workflow</p>
            <h2 className="text-xl font-semibold">{workflow.name}</h2>
            <p className="text-xs text-gray-400">{workflow.description || 'Sin descripción'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-900 text-gray-300 hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-2 border-b border-gray-800 text-xs text-gray-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Trigger</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-gray-200">
                  {workflow.trigger_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Estado</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.2em] ${
                    workflow.is_active
                      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-200 border border-red-500/30'
                  }`}
                >
                  {workflow.is_active ? 'ACTIVO' : 'PAUSADO'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Pasos</p>
              <p className="text-lg font-semibold text-white">{workflow.steps.length}</p>
            </div>
          </div>
          {Object.keys(stepTypes).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300">
              {Object.entries(stepTypes).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-900 border border-white/10"
                >
                  {type} · {count}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {workflow.steps.length === 0 ? (
            <p className="text-sm text-gray-400">Este workflow todavía no tiene pasos configurados.</p>
          ) : (
            sortedSteps.map((step: any, idx: number) => (
              <div
                key={step.id || idx}
                className="border border-white/5 rounded-xl p-3 text-sm bg-gray-900/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[11px] text-cyan-100 font-semibold">
                    {step.step_order + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {step.action_type === 'wait' && 'Esperar'}
                      {step.action_type === 'send_campaign' && 'Enviar campaña'}
                      {step.action_type === 'send_saved_mail' && 'Enviar mail guardado'}
                      {step.action_type === 'add_to_group' && 'Añadir a grupo'}
                      {step.action_type === 'remove_from_group' && 'Quitar de grupo'}
                      {!['wait', 'send_campaign', 'send_saved_mail', 'add_to_group', 'remove_from_group'].includes(
                        step.action_type,
                      ) && step.action_type}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Tipo interno: <span className="text-gray-200">{step.action_type}</span>
                    </p>
                  </div>
                </div>
                {Object.keys(step.action_config || {}).length > 0 && (
                  <pre className="mt-2 text-[11px] text-gray-300 bg-black/30 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(step.action_config || {}, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
          <p className="mt-2 text-[11px] text-gray-500">
            Este workflow puede disparar campañas, mails guardados o acciones de grupos. Los usuarios y el tracking
            fino (aperturas, clics, rebotes) se visualizan en las campañas y en la pestaña de tracking, filtrando por
            campaña o segmento.
          </p>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ title, value, loading }: { title: string; value: number | string; loading?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-[0.3em] mb-2">{title}</p>
      <p className="text-2xl font-semibold text-white">{loading ? '...' : value}</p>
    </div>
  );
}

function CampaignDetailDrawer({
  campaign,
  recipients,
  loading,
  onClose,
}: {
  campaign: Campaign;
  recipients: any[];
  loading: boolean;
  onClose: () => void;
}) {
  const sentCount = recipients.length;
  const openedCount = recipients.filter((r: any) => r.opened_at).length;
  const clickedCount = recipients.filter((r: any) => r.clicked_at).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-3xl w-full mx-4 bg-gray-950 border border-gray-800 rounded-3xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Campaña</p>
            <h2 className="text-xl font-semibold">{campaign.title}</h2>
            <p className="text-xs text-gray-400">Asunto: {campaign.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-900 text-gray-300 hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-2 border-b border-gray-800 text-xs text-gray-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                  campaign.status === 'sent' || (campaign.stats?.sent > 0 && campaign.send_mode === 'immediate')
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : campaign.status === 'failed'
                      ? 'bg-red-500/15 text-red-200 border border-red-500/30'
                      : campaign.status === 'scheduled'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : campaign.status === 'pending'
                      ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                      : 'bg-gray-700/60 text-gray-200 border border-gray-500/40'
                }`}
              >
                {campaign.stats?.sent > 0 && campaign.send_mode === 'immediate' ? 'ACTIVA' : 
                 campaign.status === 'scheduled' ? 'PROGRAMADA' :
                 campaign.status === 'pending' ? 'PENDIENTE' :
                 campaign.status}
              </span>
              {campaign.send_mode && (
                <span className="text-[11px] text-gray-400">
                  {campaign.stats?.sent > 0 && (
                    <span className="text-cyan-400">
                      {campaign.stats.sent} enviados
                    </span>
                  )}
                  {campaign.send_mode === 'scheduled' && campaign.scheduled_for && (
                    <span className="text-blue-400">
                      {new Date(campaign.scheduled_for).toLocaleString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-400">
            {campaign.sent_at && (
              <span>
                Enviado:{' '}
                <span className="text-gray-200">
                  {new Date(campaign.sent_at).toLocaleString('es-ES')}
                </span>
              </span>
            )}
            {campaign.scheduled_for && (
              <span>
                Programado:{' '}
                <span className="text-gray-200">
                  {new Date(campaign.scheduled_for).toLocaleString('es-ES')}
                </span>
              </span>
            )}
            {/* created_by puede no estar presente en el tipo Campaign actual */}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-xl border border-white/10 bg-white/5 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Enviados</p>
              <p className="text-sm font-semibold text-white">{sentCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-200">Abiertos</p>
              <p className="text-sm font-semibold text-emerald-100">
                {openedCount}
                {sentCount > 0 && (
                  <span className="text-[10px] text-emerald-200/80 ml-1">
                    ({Math.round((openedCount / sentCount) * 100) || 0}%)
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200">Clics</p>
              <p className="text-sm font-semibold text-cyan-100">
                {clickedCount}
                {sentCount > 0 && (
                  <span className="text-[10px] text-cyan-200/80 ml-1">
                    ({Math.round((clickedCount / sentCount) * 100) || 0}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400">Cargando destinatarios…</p>
          ) : recipients.length === 0 ? (
            <p className="text-sm text-gray-400">No hay destinatarios registrados.</p>
          ) : (
            <div className="space-y-3">
              {recipients.map((recipient: any) => (
                <div
                  key={recipient.id}
                  className="border border-white/5 rounded-xl p-3 text-sm bg-gray-900/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{recipient.email}</p>
                      <p className="text-[11px] text-gray-400">
                        Estado:{' '}
                        <span className="text-gray-200">
                          {recipient.status || 'desconocido'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px]">
                      {recipient.opened_at && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                          Abierto {new Date(recipient.opened_at).toLocaleString('es-ES')}
                        </span>
                      )}
                      {recipient.clicked_at && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                          Click {new Date(recipient.clicked_at).toLocaleString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                  {recipient.last_error && (
                    <p className="mt-2 text-[11px] text-red-300 bg-red-500/5 rounded-md px-2 py-1">
                      Error: {recipient.last_error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs text-gray-400">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-cyan-300"
      >
        ℹ️ Info
        <span className="text-[10px] uppercase tracking-[0.3em]">
          {open ? 'ocultar' : 'ver'}
        </span>
      </button>
      {open && <p className="mt-1 text-gray-300">{text}</p>}
    </div>
  );
}

function MailDetailModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data: campaignData, isLoading: campaignLoading } = useSWR(
    `/api/admin/newsletter/campaigns/${campaignId}`,
    fetcher
  );
  const { data: recipientsData, isLoading: recipientsLoading } = useSWR(
    `/api/admin/newsletter/campaigns/${campaignId}/recipients`,
    fetcher
  );
  const { data: eventsData, isLoading: eventsLoading } = useSWR(
    `/api/admin/newsletter/campaigns/${campaignId}/events`,
    fetcher
  );

  const campaign = campaignData?.campaign;
  const recipients = recipientsData?.recipients || [];
  const events = eventsData?.events || [];

  const openedRecipients = recipients.filter((r: any) => r.opened_at);
  const clickedRecipients = recipients.filter((r: any) => r.clicked_at);
  const openRate = recipients.length > 0 ? (openedRecipients.length / recipients.length) * 100 : 0;
  const clickRate = openedRecipients.length > 0 ? (clickedRecipients.length / openedRecipients.length) * 100 : 0;

  if (campaignLoading || !campaign) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gray-950 border border-gray-800 rounded-3xl p-8">
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-5xl w-full bg-gray-950 border border-gray-800 rounded-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-1">Detalle completo del mail</p>
            <h2 className="text-2xl font-semibold text-white mb-2">{campaign.subject}</h2>
            {campaign.ab_test_enabled && campaign.subject_b && (
              <p className="text-sm text-purple-400">Variante B: {campaign.subject_b}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className={`text-xs px-3 py-1 rounded-full ${
                campaign.status === 'sent' ? 'bg-green-600/20 text-green-300' :
                campaign.status === 'scheduled' ? 'bg-blue-600/20 text-blue-300' :
                campaign.status === 'pending' ? 'bg-yellow-600/20 text-yellow-300' :
                'bg-gray-700 text-gray-300'
              }`}>
                {campaign.status.toUpperCase()}
              </span>
              {campaign.mail_category && (
                <span className="text-xs px-3 py-1 rounded-full bg-cyan-600/20 text-cyan-300">
                  {campaign.mail_category}
                </span>
              )}
              {campaign.ab_test_enabled && (
                <span className="text-xs px-3 py-1 rounded-full bg-purple-600/20 text-purple-300">
                  🧪 A/B Test
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-900 text-gray-300 hover:bg-gray-800 flex-shrink-0 ml-4"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Enviados</p>
              <p className="text-2xl font-bold text-white">{recipients.length}</p>
            </div>
            <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-700/30">
              <p className="text-xs text-cyan-400 mb-1">Abiertos</p>
              <p className="text-2xl font-bold text-cyan-300">{openedRecipients.length}</p>
            </div>
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
              <p className="text-xs text-purple-400 mb-1">Clicks</p>
              <p className="text-2xl font-bold text-purple-300">{clickedRecipients.length}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Open Rate</p>
              <p className={`text-2xl font-bold ${
                openRate > 20 ? 'text-green-400' : openRate > 10 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {openRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">CTR</p>
              <p className={`text-2xl font-bold ${
                clickRate > 5 ? 'text-green-400' : clickRate > 2 ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {clickRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Información de fechas */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-white mb-3">📅 Fechas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Creado</p>
                <p className="text-white">{new Date(campaign.created_at).toLocaleString('es-ES')}</p>
              </div>
              {campaign.sent_at && (
                <div>
                  <p className="text-gray-400">Enviado</p>
                  <p className="text-white">{new Date(campaign.sent_at).toLocaleString('es-ES')}</p>
                </div>
              )}
              {campaign.scheduled_for && (
                <div>
                  <p className="text-gray-400">Programado para</p>
                  <p className="text-white">{new Date(campaign.scheduled_for).toLocaleString('es-ES')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cuerpo del mensaje */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-white mb-3">📝 Cuerpo del mensaje</h3>
            <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {campaign.body}
            </div>
          </div>

          {/* A/B Test Info */}
          {campaign.ab_test_enabled && (
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">🧪 Información A/B Test</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-purple-400">Duración del test</p>
                  <p className="text-white">{campaign.test_duration} {campaign.test_duration_unit}</p>
                </div>
                <div>
                  <p className="text-purple-400">Criterio ganador</p>
                  <p className="text-white">{campaign.winner_criteria}</p>
                </div>
                {campaign.ab_test_winner && (
                  <div className="col-span-2">
                    <p className="text-purple-400">Ganador</p>
                    <p className="text-green-300 font-semibold">Variante {campaign.ab_test_winner}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usuarios que abrieron */}
          {openedRecipients.length > 0 && (
            <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-700/30">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">👁️ Usuarios que abrieron ({openedRecipients.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {openedRecipients.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 px-2 bg-cyan-950/30 rounded">
                    <span className="text-cyan-200">{r.email}</span>
                    <span className="text-cyan-400 text-[10px]">
                      {new Date(r.opened_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usuarios que hicieron click */}
          {clickedRecipients.length > 0 && (
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">🖱️ Usuarios que hicieron click ({clickedRecipients.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {clickedRecipients.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 px-2 bg-purple-950/30 rounded">
                    <span className="text-purple-200">{r.email}</span>
                    <span className="text-purple-400 text-[10px]">
                      {new Date(r.clicked_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eventos recientes */}
          {events.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-3">📊 Eventos recientes</h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {events.slice(0, 20).map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-800 rounded">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        event.event_type === 'opened' ? 'bg-cyan-400' :
                        event.event_type === 'clicked' ? 'bg-purple-400' :
                        event.event_type === 'delivered' ? 'bg-green-400' :
                        'bg-gray-400'
                      }`} />
                      <span className="text-gray-300">{event.event_type}</span>
                    </div>
                    <span className="text-gray-500 text-[10px]">
                      {new Date(event.occurred_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

