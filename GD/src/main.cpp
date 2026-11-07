#include <Geode/Geode.hpp>
#include <Geode/modify/LevelInfoLayer.hpp>
#include <Geode/utils/web.hpp>
#include <Geode/utils/async.hpp>
#include <Geode/ui/TextInput.hpp>
#include <Geode/ui/Popup.hpp>
#include <cmath>
#include <stdexcept>

using namespace geode::prelude;

// Helper to map GD Demon enum to string difficulty expected by your database
std::string getDemonDifficultyString(GJGameLevel* level) {
	if (!level->m_demon.value()) return "Easy"; // not a demon at all — shouldn't normally hit this path

	switch (level->m_demonDifficulty) {
		case 3: return "Easy";
		case 4: return "Medium";
		case 5: return "Insane";
		case 6: return "Extreme";
		case 0:
		default: return "Hard";
	}
}

// Helper to get admin password (checks local auth file first, then Geode setting)
std::string getAdminPassword() {
	auto saveFile = Mod::get()->getSaveDir() / "axozap_auth.txt";
	if (std::filesystem::exists(saveFile)) {
		std::ifstream file(saveFile);
		if (file.is_open()) {
			std::string key;
			std::getline(file, key);
			// Trim whitespace / newlines
			while (!key.empty() && (key.back() == '\r' || key.back() == '\n' || key.back() == ' ')) {
				key.pop_back();
			}
			if (!key.empty()) return key;
		}
	}
	return Mod::get()->getSettingValue<std::string>("admin-password");
}

// Custom Popup to confirm details and add optional Video URL / Attempts / flags
class SubmitDemonPopup : public geode::Popup {
protected:
	GJGameLevel* m_level = nullptr;
	TextInput* m_videoInput = nullptr;
	TextInput* m_attemptsInput = nullptr;
	TextInput* m_tierInput = nullptr;
	TextInput* m_enjoymentInput = nullptr;
	CCMenuItemToggler* m_moonToggle = nullptr;
	CCMenuItemToggler* m_weeklyToggle = nullptr;
	CCMenuItemToggler* m_gauntletToggle = nullptr;
	CCMenuItemToggler* m_eventToggle = nullptr;
	CCMenuItemToggler* m_secretToggle = nullptr;
	async::TaskHolder<web::WebResponse> m_listener;

	bool init(GJGameLevel* level) {
		if (!Popup::init(300.f, 300.f)) return false;

		m_level = level;
		this->setTitle("Send to Demon List");

		float width = m_mainLayer->getContentWidth();
		float height = m_mainLayer->getContentHeight();

		// 1. Attempts Input
		auto attemptsLabel = CCLabelBMFont::create("Attempts:", "bigFont.fnt");
		attemptsLabel->setScale(0.4f);
		attemptsLabel->setPosition({ width / 2 - 80, height - 45 });
		m_mainLayer->addChild(attemptsLabel);

		m_attemptsInput = TextInput::create(120.f, "Attempts", "chatFont.fnt");
		m_attemptsInput->setFilter("0123456789");
		m_attemptsInput->setPosition({ width / 2 + 40, height - 45 });
		m_mainLayer->addChild(m_attemptsInput);

		// 2. Video URL Input
		auto videoLabel = CCLabelBMFont::create("Video URL:", "bigFont.fnt");
		videoLabel->setScale(0.4f);
		videoLabel->setPosition({ width / 2 - 80, height - 85 });
		m_mainLayer->addChild(videoLabel);

		m_videoInput = TextInput::create(160.f, "https://youtu.be/...", "chatFont.fnt");
		m_videoInput->setPosition({ width / 2 + 40, height - 85 });
		m_mainLayer->addChild(m_videoInput);

		// Personal ratings are saved on AxoZap's site, independently of GDDL.
		auto tierLabel = CCLabelBMFont::create("My Tier", "bigFont.fnt");
		tierLabel->setScale(0.35f);
		tierLabel->setPosition({ 75.f, height - 118.f });
		m_mainLayer->addChild(tierLabel);
		m_tierInput = TextInput::create(100.f, "Optional", "chatFont.fnt");
		m_tierInput->setFilter("0123456789");
		m_tierInput->setPosition({ 75.f, height - 143.f });
		m_mainLayer->addChild(m_tierInput);

		auto enjoymentLabel = CCLabelBMFont::create("Enjoyment /10", "bigFont.fnt");
		enjoymentLabel->setScale(0.35f);
		enjoymentLabel->setPosition({ 225.f, height - 118.f });
		m_mainLayer->addChild(enjoymentLabel);
		m_enjoymentInput = TextInput::create(100.f, "Optional", "chatFont.fnt");
		m_enjoymentInput->setFilter("0123456789.");
		m_enjoymentInput->setPosition({ 225.f, height - 143.f });
		m_mainLayer->addChild(m_enjoymentInput);

		// Checkboxes: Moon / Weekly / Gauntlet / Event / Secret (Hidden)
		float toggleY = height - 178.f;
		bool isPlat = m_level->isPlatformer() || m_level->m_levelLength == 5;
		bool isWeekly = m_level->m_dailyID.value() > 0;
		bool isGauntlet = m_level->m_gauntletLevel || m_level->m_gauntletLevel2;

		m_moonToggle     = makeToggle("Moon (Plat)",      35.f,  toggleY,         isPlat);
		m_weeklyToggle   = makeToggle("Weekly",           165.f, toggleY,         isWeekly);
		m_gauntletToggle = makeToggle("Gauntlet",         35.f,  toggleY - 26.f,  isGauntlet);
		m_eventToggle    = makeToggle("Event",            165.f, toggleY - 26.f,  false);
		m_secretToggle   = makeToggle("Secret (Hidden)",  35.f,  toggleY - 52.f,  false);

		// 4. Send Button
		auto sendBtnBtn = ButtonSprite::create("Send");
		auto sendBtn = CCMenuItemSpriteExtra::create(
			sendBtnBtn,
			this,
			menu_selector(SubmitDemonPopup::onSend)
		);
		sendBtn->setPosition({ width / 2, 25.f });
		m_buttonMenu->addChild(sendBtn);

		return true;
	}

	// Small helper: builds a labeled toggle checkbox
	CCMenuItemToggler* makeToggle(const char* label, float x, float y, bool defaultOn = false) {
		auto lbl = CCLabelBMFont::create(label, "bigFont.fnt");
		lbl->setScale(0.38f);
		lbl->setAnchorPoint({ 0.f, 0.5f });
		lbl->setPosition({ x + 20.f, y });
		m_mainLayer->addChild(lbl);

		auto toggle = CCMenuItemToggler::createWithStandardSprites(
			this,
			menu_selector(SubmitDemonPopup::onToggle),
			0.55f
		);
		toggle->setPosition({ x, y });
		toggle->toggle(defaultOn);
		m_buttonMenu->addChild(toggle);
		return toggle;
	}

	// No-op: we only read toggle state at submit time
	void onToggle(CCObject*) {}

	void onSend(CCObject*) {
		std::string apiUrl = Mod::get()->getSettingValue<std::string>("api-url");
		std::string password = getAdminPassword();

		if (password.empty()) {
			FLAlertLayer::create("Error", "Unauthorized: axozap_auth.txt not found and no password set in settings!", "OK")->show();
			return;
		}

		matjson::Value demonObj;
		demonObj["name"] = m_level->m_levelName.c_str();
		demonObj["difficulty"] = getDemonDifficultyString(m_level);
		demonObj["rating"] = m_moonToggle->isToggled() ? "Moon" : "Star";
		demonObj["gauntlet"] = m_gauntletToggle->isToggled();
		demonObj["weekly"] = m_weeklyToggle->isToggled();
		demonObj["event"] = m_eventToggle->isToggled();
		demonObj["hidden"] = m_secretToggle->isToggled();
		demonObj["levelId"] = std::to_string(m_level->m_levelID.value());

		std::string attStr = m_attemptsInput->getString();
		if (!attStr.empty()) {
			try { demonObj["attempts"] = std::stoi(attStr); }
			catch (...) { FLAlertLayer::create("Invalid attempts", "Enter a valid whole number of attempts.", "OK")->show(); return; }
		}

		const auto tierText = m_tierInput->getString();
		if (!tierText.empty()) {
			try {
				const int tier = std::stoi(tierText);
				if (tier < 1) throw std::invalid_argument("tier");
				demonObj["tier"] = tier;
			} catch (...) {
				FLAlertLayer::create("Invalid tier", "Enter a positive whole-number tier, or leave it blank.", "OK")->show();
				return;
			}
		}
		const auto enjoymentText = m_enjoymentInput->getString();
		if (!enjoymentText.empty()) {
			try {
				size_t consumed = 0;
				const double enjoyment = std::stod(enjoymentText, &consumed);
				if (consumed != enjoymentText.size() || !std::isfinite(enjoyment) || enjoyment < 0 || enjoyment > 10) throw std::invalid_argument("enjoyment");
				demonObj["enjoyment"] = enjoyment;
			} catch (...) {
				FLAlertLayer::create("Invalid enjoyment", "Enter an enjoyment score from 0 to 10, or leave it blank.", "OK")->show();
				return;
			}
		}

		std::string vidUrl = m_videoInput->getString();
		if (!vidUrl.empty()) {
			demonObj["videoUrl"] = vidUrl;
		}

		matjson::Value body;
		body["password"] = password;
		body["demon"] = demonObj;

		while (!apiUrl.empty() && apiUrl.back() == '/') {
			apiUrl.pop_back();
		}

		std::string postUrl = fmt::format("{}/demons", apiUrl);

		web::WebRequest req;
		req.timeout(std::chrono::seconds(15));
		req.header("Content-Type", "application/json");
		req.bodyJSON(body);

		// Don't close yet — wait for the response first
		m_listener.spawn(
			req.post(postUrl),
			[this, postUrl](web::WebResponse res) {
				if (res.ok()) {
					FLAlertLayer::create("Success!", "Demon added to your list successfully!", "OK")->show();
				} else {
					auto errText = res.string().unwrapOr("Unknown Error");
					FLAlertLayer::create("Error", fmt::format("Failed to add demon: {}\nURL: {}", errText, postUrl), "OK")->show();
				}
				this->keyBackClicked(); // close the popup now that we're done
			}
		);
	}

public:
	static SubmitDemonPopup* create(GJGameLevel* level) {
		auto ret = new SubmitDemonPopup();
		if (ret && ret->init(level)) {
			ret->autorelease();
			return ret;
		}
		CC_SAFE_DELETE(ret);
		return nullptr;
	}
};

// Hook into LevelInfoLayer to inject the green flame button into GD's UI
class $modify(DemonSyncLevelInfoLayer, LevelInfoLayer) {
	bool init(GJGameLevel* level, bool challenge) {
		if (!LevelInfoLayer::init(level, challenge)) return false;

		// Only inject the button if the level is actually a Demon and authentication is present
		if (level->m_demon.value() && !getAdminPassword().empty()) {
			auto sideMenu = this->getChildByID("left-side-menu");
			if (!sideMenu) {
				sideMenu = this->getChildByID("other-menu");
			}

			if (sideMenu) {
				// Green flame circle button icon
				auto iconSpr = CCSprite::create("icon.png"_spr);
				auto btnSprite = CircleButtonSprite::create(
					iconSpr,
					CircleBaseColor::Green,
					CircleBaseSize::Medium
				);

				auto syncBtn = CCMenuItemSpriteExtra::create(
					btnSprite,
					this,
					menu_selector(DemonSyncLevelInfoLayer::onSyncDemon)
				);
				syncBtn->setID("sync-demon-button"_spr);

				sideMenu->addChild(syncBtn);
				sideMenu->updateLayout();
			}
		}

		return true;
	}

	void onSyncDemon(CCObject*) {
		SubmitDemonPopup::create(m_level)->show();
	}
};
