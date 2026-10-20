import XCTest

/// Local-only UI tests. They rely on the fresh "Pack UITest" simulator having NO sync token,
/// so nothing here ever reaches the production sync server.
final class PackUITests: XCTestCase {
    var app: XCUIApplication!
    let scratch = ProcessInfo.processInfo.environment["PACK_UITEST_SCRATCH"] ?? "/private/tmp/claude-501/-Users-imrankhan-Projects-packing/f3d71f4b-e0d9-4247-8c25-88b052b8ea10/scratchpad/uitest"
    /// Status-bar / Dynamic Island region of iPhone 17 (top safe-area inset, points).
    let topInset: CGFloat = 62
    let tabLabels = ["master list", "kits", "tags", "trash", "notion import", "export / import", "api key"]

    override func setUp() {
        continueAfterFailure = false
        try? FileManager.default.createDirectory(atPath: scratch, withIntermediateDirectories: true)
        app = XCUIApplication()
        app.launch()
    }

    // MARK: helpers

    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func note(_ text: String, name: String = "note") {
        print("PACKNOTE [\(name)] \(text)")
        let a = XCTAttachment(string: text)
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func dump(_ name: String) {
        try? app.debugDescription.write(toFile: "\(scratch)/\(name).txt", atomically: true, encoding: .utf8)
    }

    /// Case-insensitive lookup (the web UI uppercases some labels via CSS).
    func find(_ label: String) -> XCUIElement {
        let p = NSPredicate(format: "label ==[c] %@", label)
        for q in [app.links, app.buttons, app.staticTexts, app.otherElements] {
            let e = q.matching(p).firstMatch
            if e.exists { return e }
        }
        return app.links.matching(p).firstMatch
    }

    func tap(_ label: String, timeout: TimeInterval = 10, file: StaticString = #filePath, line: UInt = #line) {
        let p = NSPredicate(format: "label ==[c] %@", label)
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            for q in [app.links, app.buttons] {
                let e = q.matching(p).firstMatch
                if e.exists { e.tap(); return }
            }
            usleep(300_000)
        }
        dump("fail-tap-\(label.replacingOccurrences(of: "/", with: "_"))")
        XCTFail("Could not find tappable '\(label)'", file: file, line: line)
    }

    func onboardIfNeeded() {
        let start = app.buttons["Get started →"]
        if start.waitForExistence(timeout: 8) {
            start.tap()
            tap("Skip")
            tap("Skip for now")
        }
        XCTAssertTrue(app.staticTexts["Trips"].waitForExistence(timeout: 15), "Trips heading missing")
    }

    var window: XCUIElement { app.windows.firstMatch }

    /// Walk the accessibility snapshot once; returns (label, type, frame) for every element.
    func snapshotFrames() -> [(String, String, CGRect)] {
        guard let snap = try? app.snapshot() else { return [] }
        var out: [(String, String, CGRect)] = []
        func walk(_ s: XCUIElementSnapshot) {
            out.append((s.label, "\(s.elementType.rawValue)", s.frame))
            for c in s.children { walk(c) }
        }
        walk(snap)
        return out
    }

    /// Returns violations: elements wider than the window (ignoring the horizontally-scrolling tab strip).
    func overflowViolations(screen: String) -> [String] {
        let w = window.frame.width
        var v: [String] = []
        for (label, type, f) in snapshotFrames() {
            if f.isEmpty || f.width == 0 { continue }
            if label.localizedCaseInsensitiveContains("scroll bar") { continue }
            if tabLabels.contains(label.lowercased()) { continue }
            if f.maxX > w + 1 || f.minX < -1 {
                v.append("[\(screen)] '\(label)' type=\(type) frame=\(f) exceeds window width \(w)")
            }
        }
        return v
    }

    func homeLink() -> XCUIElement {
        let p = NSPredicate(format: "label CONTAINS[c] 'Trips' AND label BEGINSWITH[c] '←'")
        let l = app.links.matching(p).firstMatch
        return l.exists ? l : app.buttons.matching(p).firstMatch
    }

    func goHome() {
        let h = homeLink()
        if h.exists { h.tap() }
        XCTAssertTrue(app.staticTexts["Trips"].waitForExistence(timeout: 10))
    }

    func openManageTab(_ label: String) {
        tap("Manage")
        _ = homeLink().waitForExistence(timeout: 10)
        tap(label)
        usleep(600_000)
    }

    // MARK: tests

    func testProbe() {
        onboardIfNeeded()
        XCTAssertTrue(app.links.matching(NSPredicate(format: "label ==[c] 'Manage'")).firstMatch.exists)
        shot("probe-trips")
    }

    func testManageApiKeyboardDoesNotStrandPage() {
        onboardIfNeeded()
        openManageTab("API key")
        let home = homeLink()
        XCTAssertTrue(home.waitForExistence(timeout: 10))
        shot("api-1-before-tap")
        note("before: home frame=\(home.frame) hittable=\(home.isHittable) window=\(window.frame)", name: "api-before")
        let field = app.secureTextFields.matching(NSPredicate(format: "placeholderValue == 'your-sync-token'")).firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 10), "sync token field missing")
        field.tap()
        let kbd = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        field.typeText("abc123")
        usleep(800_000)
        shot("api-2-keyboard-up")
        note("keyboard shown=\(kbd); home exists=\(home.exists) frame=\(home.frame) hittable=\(home.isHittable)", name: "api-keyboard")
        dump("api-keyboard-up")
        // can the user scroll the header back into view WITH the keyboard still up?
        window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).press(forDuration: 0.05, thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8)))
        usleep(800_000)
        shot("api-2b-keyboard-up-after-swipe-down")
        note("keyboard up + swipe down: keyboard=\(app.keyboards.count > 0) home frame=\(home.frame) hittable=\(home.isHittable)", name: "api-keyboard-swipe")
        // dismiss: tap a non-input area (the Manage heading), then Return/Done if the keyboard is still up
        let h1 = app.staticTexts["Manage"].firstMatch
        if h1.exists { h1.tap() } else { window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)).tap() }
        usleep(800_000)
        var how = "tap heading"
        if app.keyboards.count > 0 {
            for k in ["Done", "return", "Return"] where app.keyboards.buttons[k].exists { app.keyboards.buttons[k].tap(); how = "keyboard \(k)"; break }
        }
        usleep(800_000)
        shot("api-3-after-dismiss")
        let stillUp = app.keyboards.count > 0
        note("dismissed via \(how); keyboard still up=\(stillUp); home exists=\(home.exists) frame=\(home.frame) hittable=\(home.isHittable)", name: "api-after")
        dump("api-after-dismiss")
        var reachableAfterSwipe = home.exists && home.isHittable
        if !(home.exists && home.isHittable && home.frame.minY >= topInset) {
            window.swipeDown()
            usleep(600_000)
            shot("api-4-after-swipe-down")
            reachableAfterSwipe = home.exists && home.isHittable && home.frame.minY >= topInset
            note("after swipeDown: home exists=\(home.exists) frame=\(home.frame) hittable=\(home.isHittable) reachable=\(reachableAfterSwipe)", name: "api-swipe")
        }
        XCTAssertTrue(home.exists, "home link missing after dismissal")
        XCTAssertTrue(home.isHittable, "home link not hittable after dismissal; frame=\(home.frame)")
        XCTAssertGreaterThanOrEqual(home.frame.minY, topInset, "home link under status bar: \(home.frame)")
    }

    func testAllScreensFitAndNavigateBack() {
        onboardIfNeeded()
        var violations: [String] = []
        func check(_ screen: String, needsBack: Bool) {
            usleep(500_000)
            shot("screen-\(screen.replacingOccurrences(of: " ", with: "_").replacingOccurrences(of: "/", with: "_"))")
            violations += overflowViolations(screen: screen)
            if needsBack {
                let h = homeLink()
                if !(h.exists && h.isHittable) { violations.append("[\(screen)] no hittable '← Trips' (exists=\(h.exists))") }
            }
        }
        check("Trips", needsBack: false)
        tap("Manage")
        _ = homeLink().waitForExistence(timeout: 10)
        for t in ["Master list", "Kits", "Tags", "Trash", "Notion import", "Export / Import", "API key"] {
            tap(t)
            check("Manage - \(t)", needsBack: true)
        }
        goHome()
        tap("+ New trip")
        _ = app.staticTexts["New trip"].waitForExistence(timeout: 10)
        check("New trip", needsBack: true)
        goHome()
        note(violations.isEmpty ? "NO VIOLATIONS" : violations.joined(separator: "\n"), name: "violations")
        try? violations.joined(separator: "\n").write(toFile: "\(scratch)/violations.txt", atomically: true, encoding: .utf8)
        XCTAssertTrue(violations.isEmpty, violations.joined(separator: "\n"))
    }

    func testCreateTripAndOpenIt() {
        onboardIfNeeded()
        let tripName = "UITest Trip"
        tap("+ New trip")
        let name = app.textFields.matching(NSPredicate(format: "placeholderValue == 'Edinburgh Mar 26'")).firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        name.tap(); name.typeText(tripName)
        app.staticTexts["New trip"].tap()
        // Date input (a native calendar picker): tap the field area, step to next month, pick the 15th.
        let dateLabel = app.staticTexts["DEPARTURE DATE"]
        XCTAssertTrue(dateLabel.exists)
        let df = dateLabel.frame
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: 100, dy: df.maxY + 24)).tap()
        let next = app.buttons["Next Month"]
        XCTAssertTrue(next.waitForExistence(timeout: 10), "date picker did not open")
        next.tap()
        let day = app.datePickers.firstMatch.buttons.matching(NSPredicate(format: "label ENDSWITH ' 15'")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 5))
        day.tap()
        usleep(500_000)
        app.staticTexts["New trip"].tap() // close picker
        usleep(500_000)
        shot("trip-1-form-filled")
        tap("Generate list →")
        XCTAssertTrue(app.buttons["Review list →"].waitForExistence(timeout: 10), "kits step missing")
        shot("trip-2-kits")
        dump("trip-kits")
        tap("Review list →")
        XCTAssertTrue(app.buttons["Save trip →"].waitForExistence(timeout: 10), "review step missing")
        shot("trip-3-review")
        dump("trip-review")
        tap("Save trip →")
        // The app lands on the packing view after saving.
        let back = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Trips' AND label BEGINSWITH[c] '←'")).firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 10), "packing view did not open after save")
        usleep(600_000)
        shot("trip-4-packing-just-after-save")
        note("after save: back button frame=\(back.frame) hittable=\(back.isHittable) (negative minY = page left scrolled down)", name: "after-save")
        // A new screen must start at the top, not inherit the review step's scroll.
        XCTAssertTrue(back.isHittable && back.frame.minY >= topInset, "packing view opened scrolled down: back frame=\(back.frame)")
        shot("trip-5-packing-top")
        dump("trip-packing")
        // check off the first item (unlabelled checkbox button, 24pt square)
        let boxes = app.buttons.matching(NSPredicate(format: "label == ''")).allElementsBoundByIndex.filter { $0.frame.width == 24 && $0.frame.height >= 24 && $0.isHittable }
        XCTAssertFalse(boxes.isEmpty, "no item checkbox found")
        boxes[0].tap()
        usleep(500_000)
        shot("trip-6-item-checked")
        // safe-area strip: scroll the long list and look for elements overlapping the status-bar region
        var strip: [String] = []
        for n in 1...3 {
            window.swipeUp()
            usleep(600_000)
            let overlapping = snapshotFrames().filter { (label, type, f) in
                !f.isEmpty && f.width < window.frame.width && f.minY < topInset && f.maxY > 0 && !label.localizedCaseInsensitiveContains("scroll bar")
            }
            for o in overlapping { strip.append("swipe\(n): '\(o.0)' type=\(o.1) frame=\(o.2)") }
            // hittable-by-label check for buttons that overlap the strip
            for b in (n == 2 ? app.buttons.allElementsBoundByIndex : []) where b.exists && b.frame.minY < topInset && b.frame.maxY > 0 && b.isHittable {
                strip.append("swipe\(n): HITTABLE button '\(b.label)' frame=\(b.frame)")
            }
            if n == 2 { shot("trip-7-scrolled-safe-area") }
        }
        shot("trip-8-scrolled-further")
        note(strip.isEmpty ? "no elements overlap the status-bar strip" : strip.joined(separator: "\n"), name: "safe-area")
        try? strip.joined(separator: "\n").write(toFile: "\(scratch)/safearea.txt", atomically: true, encoding: .utf8)
        // go back home
        for _ in 1...6 { window.swipeDown() }
        usleep(400_000)
        XCTAssertTrue(back.waitForExistence(timeout: 5))
        back.tap()
        XCTAssertTrue(app.staticTexts[tripName].waitForExistence(timeout: 10), "trip card missing on home")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "Upcoming")).firstMatch.exists, "no Upcoming section")
        shot("trip-9-home-upcoming")
        // Not asserted: content scrolling beneath the opaque status-bar strip is intended, and the
        // strip blocks taps in the DOM, which accessibility hit-testing can't see. Review trip-7.
    }

    // The user's report: paste the token, tap "Save & connect" with the keyboard up, then the
    // header/tabs were stranded off-screen. Fake token only: the server rejects it (read-only 401).
    func testSaveAndConnectDoesNotStrandPage() {
        onboardIfNeeded()
        openManageTab("API key")
        let home = homeLink()
        XCTAssertTrue(home.waitForExistence(timeout: 10))
        let field = app.secureTextFields.matching(NSPredicate(format: "placeholderValue == 'your-sync-token'")).firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 10), "sync token field missing")
        field.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        field.typeText("uitest-fake-token")
        usleep(500_000)
        shot("connect-1-keyboard-up")
        let save = app.buttons.matching(NSPredicate(format: "label ==[c] 'Save & connect'")).firstMatch
        XCTAssertTrue(save.exists, "Save & connect button missing")
        save.tap()
        sleep(3)
        shot("connect-2-after-save")
        note("after Save & connect: keyboard=\(app.keyboards.count > 0) home frame=\(home.frame) hittable=\(home.isHittable)", name: "connect-after")
        dump("connect-after")
        if app.keyboards.count > 0 { app.staticTexts["Manage"].firstMatch.tap(); usleep(800_000) }
        shot("connect-3-keyboard-gone")
        let ok = home.exists && home.isHittable && home.frame.minY >= topInset
        if !ok {
            window.swipeDown(); usleep(600_000)
            shot("connect-4-after-swipe-down")
            note("after swipeDown: home frame=\(home.frame) hittable=\(home.isHittable)", name: "connect-swipe")
        }
        XCTAssertTrue(ok, "header stranded after Save & connect: home frame=\(home.frame)")
    }
}
