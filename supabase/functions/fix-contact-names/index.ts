import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactToFix {
  id: string;
  phone_number: string;
  name: string;
  instance_id: string;
}

interface Instance {
  id: string;
  api_url: string;
  api_key: string;
  instance_name: string;
}

interface FixResult {
  contactId: string;
  phoneNumber: string;
  oldName: string;
  newName?: string;
  profilePictureUrl?: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[fix-contact-names] Starting contact name correction process');

    // 1. Find all contacts with incorrect names (containing "Diego Malta")
    const { data: contactsToFix, error: fetchError } = await supabase
      .from('whatsapp_contacts')
      .select('id, phone_number, name, instance_id')
      .like('name', '%Diego Malta%');

    if (fetchError) {
      console.error('[fix-contact-names] Error fetching contacts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contactsToFix || contactsToFix.length === 0) {
      console.log('[fix-contact-names] No contacts to fix');
      return new Response(
        JSON.stringify({ 
          message: 'No contacts with incorrect names found',
          total: 0,
          updated: 0,
          failed: 0,
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-contact-names] Found ${contactsToFix.length} contacts to fix`);

    const results: FixResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 2. Process each contact
    for (const contact of contactsToFix) {
      console.log(`[fix-contact-names] Processing contact: ${contact.phone_number} (${contact.name})`);
      
      try {
        // Get instance details
        const { data: instance, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .select('id, api_url, api_key, instance_name')
          .eq('id', contact.instance_id)
          .single();

        if (instanceError || !instance) {
          console.error('[fix-contact-names] Error fetching instance:', instanceError);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            success: false,
            error: 'Instance not found'
          });
          failedCount++;
          continue;
        }

        // Call Evolution API to fetch profile
        const fetchProfileUrl = `${instance.api_url}/chat/fetchProfile/${instance.instance_name}`;
        console.log(`[fix-contact-names] Fetching profile from: ${fetchProfileUrl}`);

        const profileResponse = await fetch(fetchProfileUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': instance.api_key,
          },
          body: JSON.stringify({
            number: contact.phone_number
          })
        });

        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error(`[fix-contact-names] Evolution API error:`, errorText);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            success: false,
            error: `API error: ${profileResponse.status}`
          });
          failedCount++;
          continue;
        }

        const profileData = await profileResponse.json();
        console.log(`[fix-contact-names] Profile data received:`, profileData);

        // Extract name from profile data (Evolution API returns it in different formats)
        const newName = profileData.name || profileData.pushName || profileData.notify || contact.phone_number;
        const profilePictureUrl = profileData.profilePictureUrl || profileData.picture || null;

        // Update contact in database
        const updateData: any = {
          name: newName,
          updated_at: new Date().toISOString()
        };

        if (profilePictureUrl) {
          updateData.profile_picture_url = profilePictureUrl;
        }

        const { error: updateError } = await supabase
          .from('whatsapp_contacts')
          .update(updateData)
          .eq('id', contact.id);

        if (updateError) {
          console.error('[fix-contact-names] Error updating contact:', updateError);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            newName: newName,
            success: false,
            error: 'Database update failed'
          });
          failedCount++;
        } else {
          console.log(`[fix-contact-names] Successfully updated contact: ${contact.phone_number} -> ${newName}`);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            newName: newName,
            profilePictureUrl: profilePictureUrl || undefined,
            success: true
          });
          successCount++;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[fix-contact-names] Error processing contact ${contact.phone_number}:`, error);
        results.push({
          contactId: contact.id,
          phoneNumber: contact.phone_number,
          oldName: contact.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
      }
    }

    // 3. Return report
    const report = {
      message: 'Contact name correction completed',
      total: contactsToFix.length,
      updated: successCount,
      failed: failedCount,
      details: results
    };

    console.log('[fix-contact-names] Process completed:', report);

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-contact-names] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
