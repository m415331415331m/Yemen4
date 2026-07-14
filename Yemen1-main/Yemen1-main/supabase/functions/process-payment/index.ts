/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      transactionId,
      providerId,
      providerCode,
      phoneNumber,
      amount,
      packageCode,
      transactionType = "recharge",
      checkLoan = false,
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const restHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Fetch provider settings
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/api_settings?provider_id=eq.${providerId}&is_active=eq.true&select=*`,
      { headers: restHeaders }
    );
    const settings = await settingsResponse.json();

    // ============================================
    // BALANCE INQUIRY
    // ============================================
    if (transactionType === "balance_inquiry") {
      if (!settings || settings.length === 0) {
        // Demo mode - return simulated balance
        return new Response(
          JSON.stringify({
            success: true,
            balance: Math.floor(Math.random() * 5000) + 100,
            lastUpdate: new Date().toLocaleString("en-GB"),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const apiSetting = settings[0];
        const balanceUrl = apiSetting.api_url?.replace("/charge", "/balance") || `${apiSetting.api_url}/balance`;
        const balanceResponse = await fetch(balanceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiSetting.api_token}`,
            "X-API-Key": apiSetting.api_key || "",
          },
          body: JSON.stringify({ phoneNumber, merchantId: apiSetting.merchant_id }),
        });
        const balanceResult = await balanceResponse.json();

        if (balanceResponse.ok) {
          return new Response(
            JSON.stringify({
              success: true,
              balance: balanceResult.balance || 0,
              lastUpdate: balanceResult.lastUpdate || new Date().toLocaleString("en-GB"),
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: balanceResult.message || "تعذر الاستعلام عن الرصيد" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: "تعذر الاتصال بمزود الخدمة" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================
    // LOAN CHECK
    // ============================================
    if (transactionType === "loan_check") {
      if (!settings || settings.length === 0) {
        // Demo mode - 30% chance of having a loan
        const hasLoan = Math.random() > 0.7;
        return new Response(
          JSON.stringify({
            success: true,
            hasLoan,
            loanAmount: hasLoan ? Math.floor(Math.random() * 5) * 100 + 100 : 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const apiSetting = settings[0];
        const loanUrl = apiSetting.api_url?.replace("/charge", "/loan") || `${apiSetting.api_url}/loan`;
        const loanResponse = await fetch(loanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiSetting.api_token}`,
            "X-API-Key": apiSetting.api_key || "",
          },
          body: JSON.stringify({ phoneNumber, merchantId: apiSetting.merchant_id }),
        });
        const loanResult = await loanResponse.json();

        return new Response(
          JSON.stringify({
            success: true,
            hasLoan: loanResult.hasLoan || false,
            loanAmount: loanResult.loanAmount || 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "تعذر التحقق من السلفة" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================
    // RECHARGE / BILL PAYMENT
    // ============================================
    if (!transactionId || !phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "بيانات غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No API settings - demo mode
    if (!settings || settings.length === 0) {
      const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;

      await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`, {
        method: "PATCH",
        headers: restHeaders,
        body: JSON.stringify({
          status: "success",
          receipt_number: receiptNumber,
          provider_transaction_id: `DEMO-${Date.now()}`,
          provider_response: { mode: "demo", message: "No API configured" },
          balance_after: Math.floor(Math.random() * 10000) + amount,
          completed_at: new Date().toISOString(),
        }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          receiptNumber,
          message: "تمت العملية بنجاح (وضع تجريبي)",
          balance: Math.floor(Math.random() * 10000) + amount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real provider API call
    const apiSetting = settings[0];

    try {
      const providerResponse = await fetch(apiSetting.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiSetting.api_token}`,
          "X-API-Key": apiSetting.api_key || "",
          "X-API-Secret": apiSetting.api_secret || "",
        },
        body: JSON.stringify({
          merchantId: apiSetting.merchant_id,
          phoneNumber,
          amount,
          packageCode: packageCode || undefined,
          reference: transactionId,
        }),
      });

      const providerResult = await providerResponse.json();

      if (providerResponse.ok && providerResult.success !== false) {
        const receiptNumber = providerResult.receiptNumber ||
          `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;

        await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`, {
          method: "PATCH",
          headers: restHeaders,
          body: JSON.stringify({
            status: "success",
            receipt_number: receiptNumber,
            provider_transaction_id: providerResult.transactionId || `PRV-${Date.now()}`,
            provider_response: providerResult,
            balance_after: providerResult.balanceAfter || null,
            completed_at: new Date().toISOString(),
          }),
        });

        return new Response(
          JSON.stringify({
            success: true,
            receiptNumber,
            message: "تمت عملية السداد بنجاح",
            balance: providerResult.balanceAfter,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const errorMsg = providerResult.message || providerResult.error || "فشلت عملية السداد";

        await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`, {
          method: "PATCH",
          headers: restHeaders,
          body: JSON.stringify({
            status: "failed",
            error_message: errorMsg,
            provider_response: providerResult,
            completed_at: new Date().toISOString(),
          }),
        });

        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (providerErr) {
      const errorMsg = providerErr instanceof Error ? providerErr.message : "تعذر الاتصال بمزود الخدمة";

      await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transactionId}`, {
        method: "PATCH",
        headers: restHeaders,
        body: JSON.stringify({
          status: "failed",
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
        }),
      });

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "حدث خطأ في الخادم",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
