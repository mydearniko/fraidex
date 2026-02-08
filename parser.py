import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import random # For jitter and random user agent selection

BASE_URL = "https://freedns.afraid.org/domain/registry/"
OUTPUT_JSON_FILE = os.path.join(os.path.dirname(__file__), "fraidex.json")

# --- List of User Agents ---
USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.6.5 Chrome/124.0.6367.243 Electron/30.1.2 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 OPR/118.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.9 Chrome/132.0.6834.210 Electron/34.3.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 YaBrowser/25.4.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.10 Chrome/132.0.6834.196 Electron/34.2.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.6.5 Chrome/124.0.6367.243 Electron/30.1.2 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.4 Chrome/130.0.6723.191 Electron/33.3.2 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.3 Chrome/130.0.6723.191 Electron/33.3.2 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.10 Chrome/132.0.6834.196 Electron/34.2.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.8.9 Chrome/132.0.6834.210 Electron/34.3.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"
]

# --- Base Headers (User-Agent will be overridden) ---
BASE_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://freedns.afraid.org/subdomain/save.php?step=2',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Priority': 'u=0, i'
}

# --- Configuration for Concurrency and Retries ---
MAX_WORKERS = 12
REQUEST_TIMEOUT = 30

MAX_FETCH_RETRIES = 19
INITIAL_BACKOFF_SECONDS = 1
BACKOFF_FACTOR = 2
JITTER_SECONDS = 0.5

def get_random_user_agent_headers():
    """Returns a new headers dictionary with a randomly chosen User-Agent."""
    headers = BASE_HEADERS.copy() # Start with a copy of base headers
    headers['User-Agent'] = random.choice(USER_AGENTS)
    return headers

def fetch_page_content(page_num, session):
    """Fetches HTML content for a given page number with retries, backoff, and random User-Agent."""
    if page_num == 1:
        url = BASE_URL
    else:
        url = f"{BASE_URL}page-{page_num}.html"
    
    current_retries = 0
    current_backoff = INITIAL_BACKOFF_SECONDS

    while current_retries <= MAX_FETCH_RETRIES:
        request_headers = get_random_user_agent_headers() # Get fresh headers for each attempt
        try:
            response = session.get(url, headers=request_headers, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return page_num, response.text
        except requests.exceptions.Timeout:
            error_msg = f"Timeout"
        except requests.exceptions.ConnectionError:
            error_msg = f"Connection error"
        except requests.exceptions.RequestException as e:
            error_msg = f"RequestException: {type(e).__name__}"
            if hasattr(e, 'response') and e.response is not None:
                 error_msg += f" (Status: {e.response.status_code})"

        print(f"{error_msg} fetching page {page_num} ({url}) with UA '{request_headers.get('User-Agent', 'N/A')}' on attempt {current_retries + 1}/{MAX_FETCH_RETRIES + 1}.")

        if current_retries < MAX_FETCH_RETRIES:
            sleep_duration = current_backoff + random.uniform(-JITTER_SECONDS, JITTER_SECONDS)
            sleep_duration = max(0.1, sleep_duration)
            
            print(f"Page {page_num}: Waiting {sleep_duration:.2f}s before next retry...")
            time.sleep(sleep_duration)
            current_backoff *= BACKOFF_FACTOR
        current_retries += 1
    
    print(f"Failed to fetch page {page_num} ({url}) after {MAX_FETCH_RETRIES + 1} attempts.")
    return page_num, None

def parse_date_from_age(age_str):
    date_match = re.search(r'\((\d{2}/\d{2}/\d{4})\)', age_str)
    if date_match:
        try:
            dt_obj = datetime.strptime(date_match.group(1), '%m/%d/%Y')
            return dt_obj.strftime('%Y-%m-%d')
        except ValueError: pass
    days_ago_match = re.search(r'(\d+)\s+days\s+ago', age_str)
    if days_ago_match:
        try:
            days = int(days_ago_match.group(1))
            dt_obj = datetime.now() - timedelta(days=days)
            return dt_obj.strftime('%Y-%m-%d')
        except ValueError: pass
    return None

def parse_domain_row(row_element):
    cells = row_element.find_all('td')
    if len(cells) != 4: return None
    domain_data = {}
    domain_cell = cells[0]
    domain_anchor = domain_cell.find('a')
    if domain_anchor and domain_anchor.has_attr('href'):
        domain_data['domain_name'] = domain_anchor.get_text(strip=True)
        domain_id_match = re.search(r'edit_domain_id=(\d+)', domain_anchor['href'])
        domain_data['domain_id'] = int(domain_id_match.group(1)) if domain_id_match else None
    else: 
        domain_data['domain_name'] = domain_cell.get_text(strip=True).split('\n')[0] if domain_cell.get_text(strip=True) else None
        domain_data['domain_id'] = None

    span_tag = domain_cell.find('span')
    if span_tag:
        span_text = span_tag.get_text(strip=True)
        hosts_match = re.search(r'\((\d+)\s+hosts\s+in\s+use\)', span_text)
        domain_data['hosts_in_use'] = int(hosts_match.group(1)) if hosts_match else 0
        website_anchor = span_tag.find('a', {'target': '_blank'})
        domain_data['website'] = website_anchor['href'] if website_anchor and website_anchor.has_attr('href') else None
    else:
        domain_data['hosts_in_use'] = 0
        domain_data['website'] = None
    domain_data['status'] = cells[1].get_text(strip=True)
    owner_cell = cells[2]
    owner_anchor = owner_cell.find('a')
    if owner_anchor and owner_anchor.has_attr('href'):
        domain_data['owner_name'] = owner_anchor.get_text(strip=True)
        owner_id_match = re.search(r'user_id=(\d+)', owner_anchor['href'])
        domain_data['owner_id'] = int(owner_id_match.group(1)) if owner_id_match else None
    else: 
        domain_data['owner_name'] = owner_cell.get_text(strip=True)
        domain_data['owner_id'] = None
    age_text = cells[3].get_text(strip=True)
    domain_data['age_raw_text'] = age_text
    domain_data['date_added'] = parse_date_from_age(age_text)
    days_ago_match = re.search(r'(\d+)\s+days\s+ago', age_text)
    domain_data['age_days'] = int(days_ago_match.group(1)) if days_ago_match else None
    return domain_data

def get_total_pages(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    page_input_form = soup.find('form', action='/domain/registry/')
    if page_input_form:
        font_tag_containing_page_info = None
        form_parent_td = page_input_form.find_parent('td')
        if form_parent_td:
            page_font_tag = form_parent_td.find('font', string=re.compile(r'Page\s+\d*\s+of\s+\d+'))
            if page_font_tag: font_tag_containing_page_info = page_font_tag
        if not font_tag_containing_page_info:
            all_font_tags = soup.find_all('font', string=re.compile(r'Page\s+\d*\s+of\s+\d+'))
            if all_font_tags: font_tag_containing_page_info = all_font_tags[-1]
        if font_tag_containing_page_info:
            text_content = font_tag_containing_page_info.get_text(separator=' ', strip=True)
            match = re.search(r'of\s*(\d+)', text_content)
            if match:
                try: return int(match.group(1))
                except ValueError: pass
    title_tag = soup.find('title')
    if title_tag:
        title_text = title_tag.get_text(strip=True)
        match = re.search(r'Page\s+\d+\s+of\s+(\d+)', title_text)
        if match:
            try: return int(match.group(1))
            except ValueError: pass
    showing_text_tag = soup.find(lambda tag: tag.name == "font" and "Showing" in tag.text and "total" in tag.text and tag.find_parent('table', {'width':'100%'}))
    if showing_text_tag:
        bold_tags = showing_text_tag.find_all('b')
        if len(bold_tags) >= 3: 
            total_items_str = bold_tags[-1].get_text(strip=True).replace(',', '')
            try:
                total_items = int(total_items_str)
                if len(bold_tags) >=2:
                    start_item_str = bold_tags[0].get_text(strip=True).replace(',', '')
                    end_item_str = bold_tags[1].get_text(strip=True).replace(',', '')
                    if start_item_str.isdigit() and end_item_str.isdigit():
                        start_item = int(start_item_str); end_item = int(end_item_str)
                        items_on_page = (end_item - start_item) + 1
                        if items_on_page > 0: return (total_items + items_on_page - 1) // items_on_page
                return (total_items + 99) // 100 
            except ValueError: pass
    print("Warning: Could not reliably determine total number of pages. Defaulting to 1.")
    return 1

def process_html_content(page_num, html_content):
    page_data = []
    if not html_content: return page_data
    soup = BeautifulSoup(html_content, 'lxml')
    data_table = None
    center_tags = soup.find_all('center')
    for center_tag in center_tags:
        if center_tag.parent and center_tag.parent.name == 'td' and center_tag.parent.get('bgcolor') == 'white':
            table_candidate = center_tag.find('table', {'width': '90%', 'border': '0'})
            if table_candidate and table_candidate.find('tr', class_=['trl', 'trd']):
                if not table_candidate.find('input', {'name':'page'}):
                    data_table = table_candidate
                    break
    if not data_table:
        data_table = soup.find('table', {'width': '90%', 'border': '0'})
        if data_table and data_table.find('input', {'name':'page'}):
             if not data_table.find('tr', class_=['trl', 'trd']): pass
             else: pass
    if data_table:
        rows = data_table.find_all('tr', class_=['trl', 'trd'])
        for row in rows:
            domain_info = parse_domain_row(row)
            if domain_info:
                domain_info['source_page_number'] = page_num
                page_data.append(domain_info)
    else:
        print(f"Could not find the main data table on page {page_num}.")
    return page_data

def main():
    start_time = time.time()
    all_domains_data = []
    
    with requests.Session() as session:
        print("Fetching page 1 to determine total pages...")
        _, html_content_page1 = fetch_page_content(1, session)
        if not html_content_page1:
            print("Failed to fetch the first page. Exiting.")
            return

        total_pages = get_total_pages(html_content_page1)
        print(f"Total pages to scrape: {total_pages}")

        print("Processing page 1...")
        all_domains_data.extend(process_html_content(1, html_content_page1))

        pages_to_fetch_nums = list(range(2, total_pages + 1))
        
        if pages_to_fetch_nums:
            print(f"Concurrently fetching and processing pages 2 to {total_pages} with {MAX_WORKERS} workers...")
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_to_page_num = {
                    executor.submit(fetch_page_content, page_num, session): page_num 
                    for page_num in pages_to_fetch_nums
                }
                
                completed_count = 0
                total_tasks = len(pages_to_fetch_nums)
                for future in as_completed(future_to_page_num):
                    original_page_num = future_to_page_num[future]
                    try:
                        fetched_page_num, html_content = future.result() 
                        if html_content:
                            all_domains_data.extend(process_html_content(fetched_page_num, html_content))
                    except Exception as exc:
                        print(f'Page {original_page_num} generated an unexpected exception: {exc}')
                    
                    completed_count += 1
                    if completed_count % 20 == 0 or completed_count == total_tasks :
                         print(f"Fetched and processed {completed_count}/{total_tasks} pages...")
    try:
        with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_domains_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully scraped {len(all_domains_data)} domains into {OUTPUT_JSON_FILE}")
    except IOError as e:
        print(f"Error writing to JSON file {OUTPUT_JSON_FILE}: {e}")

    end_time = time.time()
    print(f"Scraping completed in {end_time - start_time:.2f} seconds.")

if __name__ == "__main__":
    try:
        import lxml
    except ImportError:
        print("Consider installing 'lxml' for faster HTML parsing: pip install lxml")
    main()