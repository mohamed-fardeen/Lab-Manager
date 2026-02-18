from PyPDF2 import PdfReader

pdf_path = r"d:\User\Downloads\build-plan.pdf"

reader = PdfReader(pdf_path)
text = ""
for page in reader.pages:
    text += page.extract_text()

print(text)