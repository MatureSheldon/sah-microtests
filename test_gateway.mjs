const GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbzXyI5c4pvpTU8wIqzX4Tz6G2wGFUXQaY335ueCXXYFb0McKiDWOKcvpS3x_YK7kcpsFA/exec';

async function testGateway() {
  console.log('Fetching dashboard for teacher T001...');
  
  // Test getDashboard
  try {
    const res = await fetch(`${GATEWAY_URL}?action=getDashboard&teacher_id=T001&date=${new Date().toISOString().split('T')[0]}`);
    if (!res.ok) {
      console.error('HTTP Error:', res.status, res.statusText);
      return;
    }
    const data = await res.json();
    console.log('Dashboard Data Response:');
    
    if (data.periods) {
      console.log(`Found ${data.periods.length} periods.`);
      if (data.periods.length > 0) {
        console.log('Sample Period:', JSON.stringify(data.periods[0], null, 2));
      }
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
  try {
    const sheetId = '1P0KjZIGraymAQWWOOdLrNDfTN6SUflAo4I9y3vMUhFA';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Homework`;
    const res = await fetch(csvUrl);
    const text = await res.text();
    const rows = text.split('\n');
    const ch4Rows = rows.filter(r => r.includes('CH04'));
    console.log('CH04 rows found in CSV:', ch4Rows.length);
    console.log(ch4Rows);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGateway();
