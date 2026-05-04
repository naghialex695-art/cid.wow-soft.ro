exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodă HTTP nepermisă." }),
    };
  }

  const apiKey = process.env.PIDKEY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: "Lipsește variabila de mediu PIDKEY_API_KEY." }),
    };
  }

  try {
    const { iid } = JSON.parse(event.body || "{}");
    const iidText = typeof iid === "string" ? iid.trim() : "";

    if (!iidText) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: "IID-ul este gol. Introdu un IID valid." }),
      };
    }

    // IID trebuie sa contina doar cifre, cratime sau spatii si sa aiba minim 30 cifre.
    const normalizedIid = iidText.replace(/[-\s]/g, "");
    if (!/^\d+$/.test(normalizedIid) || normalizedIid.length < 30) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: "IID invalid, verifică din nou codul introdus." }),
      };
    }

    const endpoint = `https://pidkey.com/ajax/cidms_api?iids=${encodeURIComponent(
      iidText
    )}&justforcheck=0&apikey=${encodeURIComponent(apiKey)}`;

    const MAX_ATTEMPTS = 4;
    const RETRY_DELAY_MS = 3000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let cid = null;
    let lastRaw = null;
    let lastParsed = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const pidkeyResponse = await fetch(endpoint);
      lastRaw = await pidkeyResponse.text();

      if (lastRaw && lastRaw.trim()) {
        try {
          lastParsed = JSON.parse(lastRaw);
        } catch {
          lastParsed = null;
        }

        const candidate = lastParsed?.confirmation_id_with_dash;
        if (candidate && typeof candidate === "string") {
          cid = candidate.trim();
          break;
        }
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (!cid) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "Verifică corectitudinea IID, dacă acesta este corect atunci contactează echipa de suport.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ cid }),
    };
  } catch (error) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: "Verifică corectitudinea IID, dacă acesta este corect atunci contactează echipa de suport.",
      }),
    };
  }
};
