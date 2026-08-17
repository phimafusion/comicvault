import time
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

options = Options()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=options)

try:
    # 1. Test app load and login screen
    driver.get("http://localhost:8080/index.html")
    time.sleep(2)
    
    logs = driver.get_log('browser')
    syntax_errors = [entry['message'] for entry in logs if 'SyntaxError' in entry['message'] or 'Uncaught' in entry['message']]
    if syntax_errors:
        print("CRITICAL: APP LOAD SYNTAX OR INITIALIZATION ERROR FOUND:")
        for err in syntax_errors:
            print("  -", err)
        driver.quit()
        sys.exit(1)
        
    login_screen = driver.find_element(By.ID, "login-screen")
    if not login_screen.is_displayed():
        print("CRITICAL: Login screen is not displayed on page load!")
        driver.quit()
        sys.exit(1)

    btn_mockup = driver.find_element(By.ID, "btn-mockup-login")
    btn_mockup.click()
    time.sleep(1)
    
    app_container = driver.find_element(By.ID, "app-container")
    if not app_container.is_displayed():
        print("CRITICAL: App container did not open after Mockup Login click!")
        driver.quit()
        sys.exit(1)

    print("APP & LOGIN CHECK PASSED 100%")

    # 2. Test Mocha Unit Test Suite
    driver.get("http://localhost:8080/tests.html")
    time.sleep(5)

    failing_details = driver.execute_script("""
        var fails = document.querySelectorAll('.test.fail');
        var list = [];
        fails.forEach(function(f) {
            var title = f.querySelector('h2') ? f.querySelector('h2').textContent : f.textContent;
            var err = f.querySelector('.error') ? f.querySelector('.error').textContent : '';
            list.push({ title: title.trim(), err: err.trim() });
        });
        return list;
    """)

    print(f"FOUND {len(failing_details)} FAILING TESTS:")
    for i, item in enumerate(failing_details, 1):
        safe_title = item['title'].encode('ascii', 'replace').decode('ascii')
        safe_err = item['err'].encode('ascii', 'replace').decode('ascii')
        print(f"\n--- FAIL {i} ---")
        print(f"TITLE: {safe_title}")
        print(f"ERROR: {safe_err}")

    if len(failing_details) > 0:
        driver.quit()
        sys.exit(1)

finally:
    driver.quit()
