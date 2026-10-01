/** Structural checks for generated citation TemplateData snapshots. */

import assert from "node:assert/strict";
import test from "node:test";
import { fetchAllCitationTemplateData } from "../scripts/update-citation-template-data.ts";
import { citationTemplateData } from "../src/config/citation-template-data/index.ts";
import { mergeCitationTemplateDataSnapshots } from "../src/domain/template-data-snapshot.ts";
import {
    normalizeTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "../src/domain/templates.ts";

const templateData = citationTemplateData;

test("covers every supported citation template title exactly once", () => {
    const expected = SUPPORTED_CITATION_TEMPLATES.map((name) =>
        normalizeTemplateName(name),
    );

    assert.deepEqual(Object.keys(templateData).toSorted(), expected.toSorted());
});

test("keeps template metadata structurally consistent", () => {
    for (const [template, metadata] of Object.entries(templateData)) {
        const ordered = new Set(metadata.paramOrder);
        assert.equal(
            ordered.size,
            metadata.paramOrder.length,
            `${template} has a duplicate paramOrder entry`,
        );
        for (const canonical of Object.keys(metadata.aliases)) {
            assert.ok(
                ordered.has(canonical),
                `${template} alias key ${canonical} is absent from paramOrder`,
            );
        }
        for (const date of metadata.dateParams ?? []) {
            assert.ok(
                ordered.has(date),
                `${template} date key ${date} is absent from paramOrder`,
            );
        }
    }
});

test("prioritizes the complete English order before Chinese-only parameters", () => {
    const english = {
        title: "Template:Cite web",
        paramOrder: ["title", "url", "title"],
        params: {
            url: { aliases: ["URL"] },
            title: { aliases: ["Title"] },
            date: { type: "date" },
            "access-date": { aliases: ["accessdate"], type: "date" },
        },
    };
    const chinese = {
        title: "Template:Cite web",
        paramOrder: ["url", "script-title", "title", "date", "script-title"],
        params: {
            title: { aliases: ["标题"], type: "date" },
            date: { type: "string" },
            "script-title": {},
            "trans-title": {},
        },
    };

    const actual = mergeCitationTemplateDataSnapshots(english, chinese);

    assert.deepEqual(actual, {
        aliases: {
            url: ["URL"],
            title: ["Title"],
            date: [],
            "access-date": ["accessdate"],
        },
        dateParams: ["date", "access-date"],
        paramOrder: [
            "title",
            "url",
            "date",
            "access-date",
            "script-title",
            "trans-title",
        ],
    });
    assert.deepEqual(english.paramOrder, ["title", "url", "title"]);
    assert.deepEqual(chinese.params.title.aliases, ["标题"]);
});

test("uses canonical English parameter insertion order when paramOrder is absent", () => {
    const actual = mergeCitationTemplateDataSnapshots(
        {
            title: "Template:Cite book",
            params: { title: {}, author: {}, date: { type: "date" } },
        },
        {
            title: "Template:Cite book",
            paramOrder: ["author", "title", "edition"],
            params: { author: {}, title: {}, edition: {} },
        },
    );

    assert.deepEqual(actual?.paramOrder, [
        "title",
        "author",
        "date",
        "edition",
    ]);
});

test("retains English metadata when Chinese TemplateData is unavailable", () => {
    const english = {
        title: "Template:Cite web",
        paramOrder: ["url"],
        params: { url: {}, title: {}, date: { type: "date" } },
    };

    for (const missing of [
        undefined,
        { title: "Template:Cite web", missing: true },
        { title: "Template:Cite web", notemplatedata: "", params: {} },
        { title: "Template:Cite web", params: {} },
        { title: "Template:Cite web", params: { url: { aliases: [12] } } },
    ]) {
        assert.deepEqual(mergeCitationTemplateDataSnapshots(english, missing), {
            aliases: { url: [], title: [], date: [] },
            dateParams: ["date"],
            paramOrder: ["url", "title", "date"],
        });
    }
});

test("falls back to complete Chinese metadata when the English template is absent", () => {
    const chinese = {
        title: "Template:Cite interview",
        paramOrder: ["title", "author"],
        params: {
            author: { aliases: ["作者"] },
            title: { aliases: ["标题"] },
            date: { type: "date" },
        },
    };

    const actual = mergeCitationTemplateDataSnapshots(
        { title: "Template:Cite interview", missing: true },
        chinese,
    );

    assert.deepEqual(actual, {
        aliases: { author: ["作者"], title: ["标题"], date: [] },
        dateParams: ["date"],
        paramOrder: ["title", "author", "date"],
    });
});

test("rejects snapshots when neither page has usable parameter metadata", () => {
    for (const invalid of [
        null,
        {},
        { title: "Template:Cite web", params: {} },
        { title: "Template:Cite web", params: [] },
        { title: "Template:Cite web", params: { url: null } },
        { title: "Template:Cite web", params: { url: {} }, paramOrder: [1] },
        { title: "Template:Cite web", params: { url: { aliases: {} } } },
    ]) {
        assert.equal(mergeCitationTemplateDataSnapshots(invalid, null), null);
    }
});

test("rejects untrusted parameter names in canonical keys, order, and aliases", () => {
    for (const invalidName of [
        " title",
        "url ",
        "url|title",
        "title=value",
        "{{title}}",
        "url\u0000",
        "x".repeat(256),
    ]) {
        for (const invalidPage of [
            {
                title: "Template:Cite web",
                params: Object.fromEntries([[invalidName, {}]]),
            },
            {
                title: "Template:Cite web",
                params: { title: {} },
                paramOrder: [invalidName],
            },
            {
                title: "Template:Cite web",
                params: { title: { aliases: [invalidName] } },
            },
        ]) {
            assert.equal(
                mergeCitationTemplateDataSnapshots(invalidPage, null),
                null,
            );
        }
    }
});

test("updater fetches both wikis in bounded batches without requiring Chinese templates", async () => {
    const requests: URL[] = [];
    const actual = await fetchAllCitationTemplateData(async (value) => {
        const url = new URL(value);
        requests.push(url);
        assert.equal(url.protocol, "https:");
        assert.equal(url.pathname, "/w/api.php");
        assert.equal(url.searchParams.get("action"), "templatedata");
        assert.equal(url.searchParams.get("formatversion"), "2");
        assert.equal(url.searchParams.get("includeMissingTitles"), "1");
        assert.equal(url.searchParams.get("redirects"), "true");
        const titles = (url.searchParams.get("titles") ?? "").split("|");
        assert.ok(titles.length <= 20);
        return JSON.stringify({
            pages: titles.map((title) =>
                url.hostname === "en.wikipedia.org"
                    ? {
                          title,
                          paramOrder: ["url"],
                          params: { url: {}, title: {} },
                      }
                    : { title, missing: true },
            ),
        });
    });

    assert.deepEqual(
        Object.keys(actual).toSorted(),
        SUPPORTED_CITATION_TEMPLATES.map((name) =>
            normalizeTemplateName(name),
        ).toSorted(),
    );
    assert.equal(
        requests.filter((url) => url.hostname === "en.wikipedia.org").length,
        2,
    );
    assert.equal(
        requests.filter((url) => url.hostname === "zh.wikipedia.org").length,
        2,
    );
    assert.deepEqual(actual["cite web"].paramOrder, ["url", "title"]);
});

test("updater resolves Chinese redirect metadata as a fallback for the requested title", async () => {
    const actual = await fetchAllCitationTemplateData(
        async (value) => {
            const url = new URL(value);
            return JSON.stringify(
                url.hostname === "en.wikipedia.org"
                    ? {
                          pages: [
                              {
                                  title: "Template:Cite interview",
                                  missing: true,
                              },
                          ],
                      }
                    : {
                          redirects: [
                              {
                                  from: "Template:Cite interview",
                                  to: "Template:Cite interviews",
                              },
                          ],
                          pages: {
                              42: {
                                  title: "Template:Cite interviews",
                                  paramOrder: ["title", "author"],
                                  params: {
                                      author: { aliases: ["作者"] },
                                      title: {},
                                      date: { type: "date" },
                                  },
                              },
                          },
                      },
            );
        },
        ["Cite interview"],
    );

    assert.deepEqual(actual["cite interview"], {
        aliases: { author: ["作者"], title: [], date: [] },
        dateParams: ["date"],
        paramOrder: ["title", "author", "date"],
    });
});

test("updater rejects incomplete results when neither wiki supplies a supported template", async () => {
    await assert.rejects(
        fetchAllCitationTemplateData(
            async () =>
                JSON.stringify({
                    pages: [{ title: "Template:Cite web", missing: true }],
                }),
            ["Cite web"],
        ),
        /TemplateData unavailable in English or Chinese Wikipedia for: Cite web/u,
    );
});
