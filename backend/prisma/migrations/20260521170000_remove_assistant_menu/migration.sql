-- AI Assistant moved out of the sidebar — now lives as an icon in the
-- top header next to the theme toggle. The /assistant route still
-- works (Header.jsx links to it), so old bookmarks continue to function.
DELETE FROM "menu_visibility" WHERE "path" = '/assistant';
